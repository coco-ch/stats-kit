using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace StatsKit;

/// <summary>
/// Traffic overview (<see cref="StatsOverview"/>): queries Umami in parallel, groups pages, aligns series on continuous slots,
/// compares with the previous period and adds the site's own data. Same computation as the Node server.
/// </summary>
internal static partial class Overview
{
    [GeneratedRegex("^/(admin|api)(/|$)")]
    private static partial Regex DefaultExclude();

    [GeneratedRegex("[?#]")]
    private static partial Regex QueryOrHash();

    [GeneratedRegex("/+$")]
    private static partial Regex TrailingSlashes();

    [GeneratedRegex("[^a-z0-9-]", RegexOptions.IgnoreCase)]
    private static partial Regex NotTagChar();

    private static string? LabelOf(IReadOnlyDictionary<string, string>? labels, Func<string, string?>? f, string key) =>
        labels is not null && labels.TryGetValue(key, out var l) ? l : f?.Invoke(key);

    /// <summary>Logical path: without query or trailing slash, without language prefix; null if it is ignored.</summary>
    internal static (string Page, string? Lang)? LogicalPath(string raw, PagesOptions opts)
    {
        var first = QueryOrHash().Split(raw)[0];
        var path = TrailingSlashes().Replace(first.Length > 0 ? first : "/", "");
        if (path.Length == 0) path = "/";
        if ((opts.Exclude ?? DefaultExclude()).IsMatch(path)) return null;
        if (opts.Languages.Count == 0) return (path, null);
        var m = new Regex($"^/({string.Join('|', opts.Languages.Select(l => NotTagChar().Replace(l, "")))})(/.*)?$").Match(path);
        return m.Success ? (m.Groups[2].Success && m.Groups[2].Value.Length > 0 ? m.Groups[2].Value : "/", m.Groups[1].Value) : null;
    }

    private static void Add(OrderedDictionary<string, double> m, string k, double n) => m[k] = (m.TryGetValue(k, out var v) ? v : 0) + n;

    private static List<Item> Sort(IEnumerable<Item> items, int limit) =>
        [.. items.OrderByDescending(i => i.Value).ThenBy(i => i.Key, Collation.Comparer).Take(limit)];

    /// <summary>Simple ranking, with the previous period if it is known.</summary>
    internal static List<Item> ToItems(List<Point> points, List<Point>? previous = null, IReadOnlyDictionary<string, string>? labels = null, int limit = 30)
    {
        OrderedDictionary<string, double>? prev = previous is null ? null : [];
        foreach (var p in previous ?? []) Add(prev!, p.X, p.Y);
        var cur = new OrderedDictionary<string, double>();
        foreach (var p in points) Add(cur, p.X, p.Y);
        return Sort(cur.Select(e => new Item(e.Key, LabelOf(labels, null, e.Key), e.Value, prev is null ? null : prev.TryGetValue(e.Key, out var b) ? b : 0)), limit);
    }

    /// <summary>Groups paths by logical page (and by site language).</summary>
    internal static (OrderedDictionary<string, double> Pages, OrderedDictionary<string, double> Langs) GroupPaths(List<Point> points, PagesOptions opts)
    {
        var pages = new OrderedDictionary<string, double>();
        var langs = new OrderedDictionary<string, double>();
        foreach (var p in points)
        {
            if (LogicalPath(p.X, opts) is not { } l) continue;
            Add(pages, l.Page, p.Y);
            if (l.Lang is not null) Add(langs, l.Lang, p.Y);
        }
        return (pages, langs);
    }

    private static List<Item> MapItems(OrderedDictionary<string, double> m, OrderedDictionary<string, double>? prev, IReadOnlyDictionary<string, string>? labels, Func<string, string?>? f, int limit) =>
        Sort(m.Select(e => new Item(e.Key, LabelOf(labels, f, e.Key), e.Value, prev is null ? null : prev.TryGetValue(e.Key, out var b) ? b : 0)), limit);

    private static List<ItemGroup> PageGroups(OrderedDictionary<string, double> pages, OrderedDictionary<string, double>? prev, List<PageGroup> groups) =>
        [.. groups.Select(g =>
        {
            var cur = new OrderedDictionary<string, double>();
            OrderedDictionary<string, double>? before = prev is null ? null : [];
            foreach (var (page, n) in pages) { var m = g.Pattern.Match(page); if (m.Success) Add(cur, m.Groups.Count > 1 && m.Groups[1].Success ? m.Groups[1].Value : page, n); }
            foreach (var (page, n) in prev ?? []) { var m = g.Pattern.Match(page); if (m.Success) Add(before!, m.Groups.Count > 1 && m.Groups[1].Success ? m.Groups[1].Value : page, n); }
            return new ItemGroup(g.Id, g.Title, MapItems(cur, before, g.Labels, null, g.Limit));
        })];

    internal sealed record Expanded(string Name, double Pageviews, double Visitors, double Visits, double Bounces, double Totaltime);

    private static List<Expanded> ParseExpanded(JsonNode? n) =>
        n is JsonArray a ? [.. a.Select(e => new Expanded(UmamiClient.Str(UmamiClient.At(e, "name")) ?? "", UmamiClient.Num(UmamiClient.At(e, "pageviews")), UmamiClient.Num(UmamiClient.At(e, "visitors")), UmamiClient.Num(UmamiClient.At(e, "visits")), UmamiClient.Num(UmamiClient.At(e, "bounces")), UmamiClient.Num(UmamiClient.At(e, "totaltime"))))] : [];

    /// <summary>Detail by logical page.</summary>
    internal static List<PageRow> PageRows(List<Expanded> path, List<Expanded> entry, List<Expanded> exit, List<Point> prev, PagesOptions opts, int limit = 60)
    {
        var rows = new OrderedDictionary<string, PageRow>();
        PageRow Row(string k)
        {
            if (!rows.TryGetValue(k, out var r)) rows[k] = r = new PageRow { Key = k, Label = LabelOf(opts.Labels, opts.Label, k), PreviousViews = 0 };
            return r;
        }
        foreach (var e in path) if (LogicalPath(e.Name, opts) is { } l) { var r = Row(l.Page); r.Views += double.IsNaN(e.Pageviews) ? 0 : e.Pageviews; r.Visitors += e.Visitors; r.Totaltime += e.Totaltime; }
        foreach (var e in entry) if (LogicalPath(e.Name, opts) is { } l) { var r = Row(l.Page); r.Entries += e.Visits; r.Bounces += e.Bounces; }
        foreach (var e in exit) if (LogicalPath(e.Name, opts) is { } l) Row(l.Page).Exits += e.Visits;
        foreach (var e in prev) if (LogicalPath(e.X, opts) is { } l && rows.TryGetValue(l.Page, out var r)) r.PreviousViews = (r.PreviousViews ?? 0) + e.Y;
        return [.. rows.Values.OrderByDescending(r => r.Views).ThenBy(r => r.Key, Collation.Comparer).Take(limit)];
    }

    /// <summary>Series aligned on continuous slots (zero where the source has nothing).</summary>
    internal static List<double> AlignSeries(List<string> slots, List<Point>? points, string unit, string timeZone)
    {
        var m = new OrderedDictionary<string, double>();
        foreach (var p in points ?? []) Add(m, Time.SlotOfLabel(p.X, unit, timeZone), p.Y);
        return [.. slots.Select(s => m.TryGetValue(s, out var v) ? v : 0)];
    }

    /// <summary>Page views by weekday (Monday = 0) and hour, from hourly slots.</summary>
    internal static List<IReadOnlyList<double>> Heatmap(List<Point>? points, string timeZone)
    {
        var grid = Enumerable.Range(0, 7).Select(_ => new double[24]).ToList();
        foreach (var p in points ?? [])
        {
            var slot = Time.SlotOfLabel(p.X, "hour", timeZone);
            if (slot.Length < 13 || !DateOnly.TryParseExact(slot[..10], "yyyy-MM-dd", out var date) || !int.TryParse(slot.AsSpan(11, 2), out var hour)) continue;
            if (hour is >= 0 and < 24) grid[((int)date.DayOfWeek + 6) % 7][hour] += p.Y;
        }
        return [.. grid.Select(r => (IReadOnlyList<double>)r)];
    }

    private static Series EmptySeries(List<string> slots, string unit) => new(unit, slots, [.. slots.Select(_ => 0d)], [.. slots.Select(_ => 0d)], null);

    /// <summary>Empty response (Umami not configured or in error): same shape, figures at zero.</summary>
    internal static StatsOverview Empty(Range range, string status, string? error, double now)
    {
        var from = Js.ParseInstant(range.From);
        var to = Js.ParseInstant(range.To);
        return new StatsOverview(1, status, error, Js.Iso(now), range, Totals.Zero, null, null,
            EmptySeries(Time.SlotsBetween(from, to, range.Unit, range.TimeZone), range.Unit),
            EmptySeries(Time.SlotsBetween(now - Time.Day, now, "hour", range.TimeZone), "hour"),
            Heatmap([], range.TimeZone), Breakdowns.Empty, [], [], [], new Counts(null, null), [], null, null, null);
    }

    /// <summary>Occurrences of each event per slot (Umami <c>events/series</c>), aligned on the slots; zero where the source has nothing.</summary>
    internal static OrderedDictionary<string, List<double>> EventSeries(List<string> slots, JsonArray points, string unit, string timeZone)
    {
        var at = new Dictionary<string, int>();
        for (var i = 0; i < slots.Count; i++) at[slots[i]] = i;
        var output = new OrderedDictionary<string, List<double>>();
        foreach (var p in points)
        {
            if (UmamiClient.Str(UmamiClient.At(p, "x")) is not { } name || UmamiClient.Str(UmamiClient.At(p, "t")) is not { } t) continue;
            if (!at.TryGetValue(Time.SlotOfLabel(t, unit, timeZone), out var i)) continue;
            if (!output.TryGetValue(name, out var row)) output[name] = row = [.. slots.Select(_ => 0d)];
            var y = UmamiClient.Num(UmamiClient.At(p, "y"));
            row[i] += double.IsFinite(y) ? y : 0;
        }
        return output;
    }

    /// <summary>Site extras, never making the response fail (read at every overview, never kept in the cache).</summary>
    internal static Task<Extras?> SiteExtrasAsync(StatsKitOptions opts, Range range, ILogger logger, CancellationToken ct) => SiteExtras(opts, range, logger, ct);

    private static async Task<T> Settle<T>(Task<T> task, T fallback)
    {
        try { return await task.ConfigureAwait(false); }
        catch (Exception) { return fallback; }
    }

    private static async Task<Extras?> SiteExtras(StatsKitOptions opts, Range range, ILogger logger, CancellationToken ct)
    {
        if (opts.Extras is null) return null;
        try
        {
            return await opts.Extras(range, ct).ConfigureAwait(false);
        }
        catch (Exception e)
        {
            logger.LogError("[stats-kit] site data unavailable: {Error}", ErrorMessage(e));
            return null;
        }
    }

    /// <summary>Short message of an error, without stack.</summary>
    internal static string ErrorMessage(Exception e) => e.Message.Length > 300 ? e.Message[..300] : e.Message;

    private static KeyValuePair<string, string> P(string k, double v) => new(k, Js.Str(v));
    private static KeyValuePair<string, string> P(string k, string v) => new(k, v);

    /// <summary>Overview of a period. Without Umami: "not configured" response (with the site data).</summary>
    internal static async Task<StatsOverview> BuildAsync(UmamiClient? umami, Range range, StatsKitOptions opts, string? dashboardUrl, double now, ILogger logger, CancellationToken ct, bool withExtras = true)
    {
        var extrasTask = withExtras ? SiteExtras(opts, range, logger, ct) : Task.FromResult<Extras?>(null);
        if (umami is null) return Empty(range, "not-configured", null, now) with { Extras = await extrasTask.ConfigureAwait(false) };
        var tz = range.TimeZone;
        double from = Js.ParseInstant(range.From), to = Js.ParseInstant(range.To);
        double pFrom = Js.ParseInstant(range.PreviousFrom), pTo = Js.ParseInstant(range.PreviousTo);
        var unit = range.Unit;
        var limit = opts.Limit;
        List<KeyValuePair<string, string>> Q(double a, double b) => [P("startAt", a), P("endAt", b)];
        Task<List<Point>> M(string type, double n = -1, double? a = null, double? b = null) =>
            Settle(umami.MetricAsync(type, a ?? from, b ?? to, n < 0 ? limit : n, ct), []);
        Task<JsonNode?> Pv(double a, double b, string u) =>
            Settle(umami.GetAsync("pageviews", [P("startAt", a), P("endAt", b), P("unit", u), P("timezone", tz)], ct), null);
        Task<List<Expanded>> Ex(string type) =>
            Settle(Then(Get("metrics/expanded", [.. Q(from, to), P("type", type), P("limit", 500)]), ParseExpanded), []);
        static async Task<TOut> Then<TOut>(Task<JsonNode?> t, Func<JsonNode?, TOut> f) => f(await t.ConfigureAwait(false));
        Task<JsonNode?> Get(string path, List<KeyValuePair<string, string>>? q = null) => umami.GetAsync(path, q, ct);

        JsonNode? stats;
        try
        {
            stats = await Get("stats", Q(from, to)).ConfigureAwait(false);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            return Empty(range, "error", ErrorMessage(e), now) with { Extras = await extrasTask.ConfigureAwait(false) };
        }

        var prevStatsT = Settle(Get("stats", Q(pFrom, pTo)), null);
        var activeT = Settle(Then(Get("active"), a => (double?)UmamiClient.Num(UmamiClient.At(a, "visitors") ?? UmamiClient.At(a, "x"))), null);
        var seriesT = Pv(from, to, unit);
        var prevSeriesT = Pv(pFrom, pTo, unit);
        var last24T = Pv(now - Time.Day, now, "hour");
        var hourlyT = unit == "hour" ? Task.FromResult<JsonNode?>(null) : Pv(from, to, "hour");
        var pathsT = M("path", 500); var prevPathsT = M("path", 500, pFrom, pTo); var entriesT = M("entry", 500); var exitsT = M("exit", 500);
        var referrersT = M("referrer"); var prevReferrersT = M("referrer", limit, pFrom, pTo); var channelsT = M("channel"); var prevChannelsT = M("channel", limit, pFrom, pTo);
        var countriesT = M("country"); var prevCountriesT = M("country", limit, pFrom, pTo); var regionsT = M("region"); var citiesT = M("city"); var languagesT = M("language", 15);
        var devicesT = M("device"); var browsersT = M("browser", 12); var osT = M("os", 12); var screensT = M("screen", 12); var eventsT = M("event", 50); var prevEventsT = M("event", 50, pFrom, pTo);
        var hostnamesT = M("hostname"); var utmST = M("utmSource"); var utmMT = M("utmMedium"); var utmCT = M("utmCampaign");
        var pathXT = Ex("path"); var entryXT = Ex("entry"); var exitXT = Ex("exit");
        var sessionsT = Settle(Get("sessions", [.. Q(from, to), P("pageSize", 12), P("page", 1)]), null);
        var sessionStatsT = Settle(Get("sessions/stats", Q(from, to)), null);
        var evSeriesT = Settle(Get("events/series", [.. Q(from, to), P("unit", unit), P("timezone", tz)]), null);
        await Task.WhenAll(evSeriesT, prevStatsT, activeT, seriesT, prevSeriesT, last24T, hourlyT, pathsT, prevPathsT, entriesT, exitsT, referrersT, prevReferrersT, channelsT, prevChannelsT,
            countriesT, prevCountriesT, regionsT, citiesT, languagesT, devicesT, browsersT, osT, screensT, eventsT, prevEventsT, hostnamesT, utmST, utmMT, utmCT,
            pathXT, entryXT, exitXT, sessionsT, sessionStatsT).ConfigureAwait(false);

        List<Point>? Series(JsonNode? n, string name) => UmamiClient.At(n, name) is JsonArray ? UmamiClient.Points(UmamiClient.At(n, name)) : null;
        var pages = opts.Pages;
        var cur = GroupPaths(pathsT.Result, pages);
        var before = GroupPaths(prevPathsT.Result, pages);
        var slots = Time.SlotsBetween(from, to, unit, tz);
        var prevSlots = Time.SlotsBetween(pFrom, pTo, unit, tz);
        var prevPageviews = Series(prevSeriesT.Result, "pageviews");
        var prevValues = AlignSeries(prevSlots, prevPageviews, unit, tz);
        var s24 = Time.SlotsBetween(now - Time.Day, now, "hour", tz);
        var events = eventsT.Result;
        var prevEvents = prevEventsT.Result;
        double GoalSum(List<Point> pts, IReadOnlyList<string> names) => pts.Where(p => names.Contains(p.X)).Sum(p => p.Y);
        var goals = opts.Goals.Select(g => new Goal(g.Id, g.Label, GoalSum(events, g.Events), GoalSum(prevEvents, g.Events))).ToList();
        var eventLabels = opts.EventLabels.Count > 0 ? opts.EventLabels : null;
        var series = seriesT.Result;
        var hourly = hourlyT.Result ?? series;
        var sessionStats = sessionStatsT.Result;
        double? CountOf(string k) => UmamiClient.At(UmamiClient.At(sessionStats, k), "value") is JsonValue v && v.TryGetValue<double>(out var d) ? d : null;
        string? S(JsonNode? n) => UmamiClient.Str(n) is { Length: > 0 } s ? s : null;

        return new StatsOverview(
            1, "ok", null, Js.Iso(now), range, UmamiClient.ParseStats(stats), prevStatsT.Result is null ? null : UmamiClient.ParseStats(prevStatsT.Result), activeT.Result,
            new Series(unit, slots, AlignSeries(slots, Series(series, "pageviews"), unit, tz), AlignSeries(slots, Series(series, "sessions"), unit, tz),
                prevPageviews is null ? null : [.. slots.Select((_, i) => i < prevValues.Count ? prevValues[i] : 0)]),
            new Series("hour", s24, AlignSeries(s24, Series(last24T.Result, "pageviews"), "hour", tz), AlignSeries(s24, Series(last24T.Result, "sessions"), "hour", tz), null),
            Heatmap(Series(hourly, "pageviews"), tz),
            new Breakdowns(
                MapItems(cur.Pages, before.Pages, pages.Labels, pages.Label, limit),
                MapItems(GroupPaths(entriesT.Result, pages).Pages, null, pages.Labels, pages.Label, limit),
                MapItems(GroupPaths(exitsT.Result, pages).Pages, null, pages.Labels, pages.Label, limit),
                ToItems(referrersT.Result, prevReferrersT.Result, null, limit),
                ToItems(channelsT.Result, prevChannelsT.Result, null, limit),
                ToItems(countriesT.Result, prevCountriesT.Result, null, limit),
                ToItems(regionsT.Result, null, null, limit),
                ToItems(citiesT.Result, null, null, limit),
                ToItems(languagesT.Result, null, null, limit),
                MapItems(cur.Langs, before.Langs, null, null, limit),
                ToItems(devicesT.Result, null, null, limit),
                ToItems(browsersT.Result, null, null, limit),
                ToItems(osT.Result, null, null, limit),
                ToItems(screensT.Result, null, null, limit),
                ToItems(events, prevEvents, eventLabels, 50),
                ToItems(hostnamesT.Result, null, null, limit),
                ToItems(utmST.Result, null, null, limit),
                ToItems(utmMT.Result, null, null, limit),
                ToItems(utmCT.Result, null, null, limit)),
            PageRows(pathXT.Result, entryXT.Result, exitXT.Result, prevPathsT.Result, pages),
            PageGroups(cur.Pages, before.Pages, pages.Groups),
            goals,
            new Counts(CountOf("countries"), CountOf("events")),
            UmamiClient.At(sessionsT.Result, "data") is JsonArray data
                ? [.. data.Select(s => new Session(S(UmamiClient.At(s, "country")), S(UmamiClient.At(s, "city")), S(UmamiClient.At(s, "device")), S(UmamiClient.At(s, "browser")), S(UmamiClient.At(s, "os")), UmamiClient.Num(UmamiClient.At(s, "views")),
                    UmamiClient.Str(UmamiClient.At(s, "lastAt")) ?? UmamiClient.Str(UmamiClient.At(s, "createdAt"))))]
                : [],
            await extrasTask.ConfigureAwait(false),
            evSeriesT.Result is JsonArray ev ? EventSeries(slots, ev, unit, tz) : null,
            dashboardUrl);
    }
}
