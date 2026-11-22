using System.Text.RegularExpressions;

namespace StatsKit.Report;

/// <summary>Attachment shown in the message ("cid:").</summary>
public sealed record InlineAttachment(string Cid, string FileName, string ContentType, byte[] Content);

/// <summary>Key figure of a site-specific card.</summary>
public sealed record ReportFigure(string Value, string Label, string? Sub = null);

/// <summary>
/// Site-specific card of the report: a title, then figures and/or lines, all given by the site in its language. Amounts are best
/// formatted with <c>Format.Money(kit.Texts, 12.5, "USD")</c> ("$12.50", "12,50 $").
/// </summary>
/// <param name="Figures">Key figures, on one light line (three per row, two on a phone).</param>
/// <param name="Lines">Lines of text, bulleted.</param>
public sealed record ReportBlock(string Title, string? Hint = null, IReadOnlyList<ReportFigure>? Figures = null, IReadOnlyList<string>? Lines = null);

/// <summary>Message ready to be handed to the site's sending function.</summary>
public sealed record ReportMessage(string Subject, string Html, string Text, IReadOnlyList<InlineAttachment> Attachments)
{
    /// <summary>The message with its images included in the page, to be shown outside a mail client.</summary>
    public string PreviewHtml => Attachments.Aggregate(Html, (html, a) => html.Replace($"cid:{a.Cid}", $"data:{a.ContentType};base64,{Convert.ToBase64String(a.Content)}", StringComparison.Ordinal));
}

/// <summary>
/// Traffic report by e-mail (weekly or on demand): a sentence that sums up the period, key figures with their change and a small
/// chart, goals, site data, rising and falling pages and sources, world map, page views per day, heatmap, Google, YouTube,
/// rankings, site-specific cards, and a plain-text version. Same message as the Node server.
/// </summary>
public static partial class ReportBuilder
{
    /// <summary>Content id of the map image.</summary>
    public const string MapCid = "stats-kit-map";
    /// <summary>Content id of the logo image.</summary>
    public const string LogoCid = "stats-kit-logo";

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"\s*[(（]\s*[)）]")]
    private static partial Regex EmptyBrackets();

    [GeneratedRegex(@"\n{3,}")]
    private static partial Regex BlankLines();

    [GeneratedRegex("[^a-z0-9-]+")]
    private static partial Regex NotId();

    private static Dictionary<string, string> V(params (string Key, string Value)[] pairs) => pairs.ToDictionary(p => p.Key, p => p.Value);

    private static double? AsNumber(object value) => value switch
    {
        double d => d, float f => f, decimal m => (double)m, int i => i, long l => l, short s => s, byte b => b,
        System.Text.Json.JsonElement { ValueKind: System.Text.Json.JsonValueKind.Number } e => e.GetDouble(),
        _ => null,
    };

    private sealed record Move(string Label, string Tag, double D);

    /// <summary>Builds the report of an overview.</summary>
    /// <param name="glance">Adds the "At a glance" card (top source, country, page and entry page, best day, busiest slot).</param>
    /// <param name="blocks">Site-specific cards, shown after the rankings.</param>
    /// <param name="search">Google Search Console figures of the period (a block when its status is "ok").</param>
    /// <param name="youtube">YouTube figures of the period (a block when its status is "ok").</param>
    /// <param name="videos">Most viewed videos of the period.</param>
    /// <param name="searchUrl">Google page of the administration (link at the end of the Google block).</param>
    /// <param name="youtubeUrl">YouTube page of the administration (link at the end of the YouTube block).</param>
    public static ReportMessage Build(StatsOverview o, Texts texts, ReportTheme theme, string siteName, string? statsUrl = null, bool weekly = false, bool worldMap = true,
        bool glance = true, IReadOnlyList<ReportBlock>? blocks = null, SearchOverview? search = null, YoutubeOverview? youtube = null, IReadOnlyList<ReportVideo>? videos = null,
        string? searchUrl = null, string? youtubeUrl = null)
    {
        string R(string key) => texts["report." + key];
        var c = Palette.From(theme);
        var k = new MailKit(c, texts);
        string Nf(double v, int d = 0, bool signed = false) => Format.Number(texts, v, d, signed);
        string Lv(string label, string value) => Format.LabelValue(texts, label, value);
        string Muted(string x) => $"<span class=\"sk-mu\" style=\"color:{c.Muted}\">{MailKit.Esc(x)}</span>";
        var tz = o.Range.TimeZone;
        var last = Js.Iso(Js.ParseInstant(o.Range.To) - 1);
        var from = Format.ShortDate(texts, o.Range.From, tz);
        var to = Format.ShortDate(texts, last, tz);
        var period = Texts.Fill(texts["periods.short"], V(("from", from), ("to", to)));
        var ok = o.Status == "ok";
        var s = o.Totals;
        var p = o.Previous;
        var ser = o.Series;
        var change = ok ? Format.PercentChange(s.Visitors, p?.Visitors) : null;
        // the totals are also available to the subject, the title, the introduction and the footer ({visitors}, {change}…)
        var vars = V(("site", siteName), ("from", from), ("to", to), ("period", period), ("days", Js.Str(o.Range.Days)),
            ("visitors", ok ? Nf(s.Visitors) : ""), ("pageviews", ok ? Nf(s.Pageviews) : ""), ("visits", ok ? Nf(s.Visits) : ""),
            ("change", change is null ? "" : Format.Percent(texts, change.Value / 100, 0, true)));
        var attachments = new List<InlineAttachment>();
        var rows = new List<string>();
        var text = new List<string> { $"{siteName} — {R("title")} ({Texts.Fill(R("subtitle"), vars)})", "" };
        // change in brackets for the text version
        string T(double n, double? b) => Format.PercentChange(n, b) is { } ch ? $"  ({Format.Percent(texts, ch / 100, 0, true)})" : "";
        string Tpts(double n, double? b, int digits) => b is not { } bv ? "" : $"  ({Texts.Fill(texts["common.points"], V(("n", Nf(Js.Round((n - bv) * Math.Pow(10, digits)) / Math.Pow(10, digits), digits, true))))})";

        // small charts of the figures (attached PNG, transparent background), in the light shade of the brand: readable on a
        // white card and on a dark one
        byte[] Rgb(string hex) => [.. Format.Rgb(hex).Select(v => (byte)v)];
        var accent = Rgb(c.Accent);
        var ghost = Rgb(Format.MixHex(c.Line, c.Muted, 0.25));
        string Image(string name, byte[]? png)
        {
            if (png is null) return "";
            var cid = $"stats-kit-{name}";
            attachments.Add(new InlineAttachment(cid, $"{name}.png", "image/png", png));
            return MailKit.Spark(cid, SparkPng.Width, SparkPng.Height);
        }
        string Line(string name, IReadOnlyList<double> values) => Image(name, SparkPng.Sparkline(values, accent));
        string Compare(string name, double? before, double now) => before is not { } b ? "" : Image(name, SparkPng.Compare(b, now, accent, ghost));

        var logo = "";
        if (c.Logo is { } l)
        {
            var size = $" width=\"{l.Width ?? 120}\"{(l.Height is { } h ? $" height=\"{h}\"" : "")}";
            if (l.Png is { } png)
            {
                attachments.Add(new InlineAttachment(LogoCid, "logo.png", "image/png", png));
                logo = $"<img src=\"cid:{LogoCid}\"{size} alt=\"{MailKit.Esc(l.Alt ?? siteName)}\" style=\"display:block;border:0;height:auto\">";
            }
            else if (l.Url is { } url)
            {
                logo = $"<img src=\"{MailKit.Esc(url)}\"{size} alt=\"{MailKit.Esc(l.Alt ?? siteName)}\" style=\"display:block;border:0;height:auto\">";
            }
        }
        rows.Add(k.Header(siteName, R("title"), Texts.Fill(R("subtitle"), vars), logo));

        // the period in one sentence: "Quieter week: 404 visitors, 4% fewer; France still in the lead"
        var headline = "";
        if (ok)
        {
            var week = o.Range.Days == 7;
            var tpl = change is null ? (week ? R("headlineNewWeek") : R("headlineNew"))
                : change > 0 ? (week ? R("headlineUpWeek") : R("headlineUp"))
                : change < 0 ? (week ? R("headlineDownWeek") : R("headlineDown"))
                : (week ? R("headlineFlatWeek") : R("headlineFlat"));
            headline = Texts.Fill(tpl, V(("visitors", Nf(s.Visitors)), ("change", change is null ? "" : Format.Percent(texts, Math.Abs(change.Value) / 100, 0))));
            var cs = o.Breakdowns.Countries;
            if (cs.Count > 0 && cs[0].Value != 0 && cs.Any(x => x.Previous is { } pv && pv != 0))
            {
                var before = cs[0];
                foreach (var x in cs) if ((x.Previous ?? 0) > (before.Previous ?? 0)) before = x;
                headline = Texts.Fill(R("headlineJoin"), V(("a", headline), ("b", Texts.Fill(before.Key == cs[0].Key ? R("headlineLeadSame") : R("headlineLeadNew"), V(("country", Format.CountryName(texts, cs[0].Key)))))));
            }
            rows.Add(k.Headline(headline));
            text.Add(headline);
            text.Add("");
        }
        if (R("intro").Length > 0)
        {
            rows.Add(k.Paragraph(Texts.Fill(R("intro"), vars)));
            text.Add(Texts.Fill(R("intro"), vars));
            text.Add("");
        }

        if (ok)
        {
            var bounceNow = s.Visits != 0 ? s.Bounces / s.Visits : 0;
            double? bounceBefore = p is not null && p.Visits != 0 ? p.Bounces / p.Visits : null;
            var avgNow = s.Visits != 0 ? s.Totaltime / s.Visits : 0;
            double? avgBefore = p is not null && p.Visits != 0 ? p.Totaltime / p.Visits : null;
            var ppvNow = s.Visits != 0 ? s.Pageviews / s.Visits : 0;
            double? ppvBefore = p is not null && p.Visits != 0 ? p.Pageviews / p.Visits : null;
            var vpvNow = s.Visitors != 0 ? s.Visits / s.Visitors : 0;
            double? vpvBefore = p is not null && p.Visitors != 0 ? p.Visits / p.Visitors : null;
            var bounce = Format.Percent(texts, bounceNow, 0);
            var avg = Format.Duration(texts, Js.Round(avgNow));
            rows.Add(k.KpiRow([
                new(Nf(s.Visitors), R("visitors"), k.Trend(s.Visitors, p?.Visitors), Line("visitors", ser.Visitors)),
                new(Nf(s.Pageviews), R("pageviews"), k.Trend(s.Pageviews, p?.Pageviews), Line("pageviews", ser.Pageviews)),
                new(Nf(s.Visits), R("visits"), k.Trend(s.Visits, p?.Visits), Compare("visits", p?.Visits, s.Visits)),
                new(bounce, R("bounce"), k.Gap(bounceNow * 100, bounceBefore is { } bb ? bb * 100 : null, 0, texts["common.points"], true), Compare("bounce", bounceBefore, bounceNow)),
            ]));
            rows.Add(k.Card(k.Figures([
                new(avg, R("avgDurationLabel"), k.Trend(avgNow, avgBefore)),
                new(Nf(ppvNow, 1), R("pagesPerVisit"), k.Trend(ppvNow, ppvBefore)),
                new(Nf(vpvNow, 1), R("visitsPerVisitor"), k.Trend(vpvNow, vpvBefore)),
            ])));
            text.Add(Lv(R("visitors"), $"{Nf(s.Visitors)}{T(s.Visitors, p?.Visitors)}"));
            text.Add(Lv(R("pageviews"), $"{Nf(s.Pageviews)}{T(s.Pageviews, p?.Pageviews)}"));
            text.Add(Lv(R("visits"), $"{Nf(s.Visits)}{T(s.Visits, p?.Visits)}"));
            text.Add(Lv(R("bounce"), $"{bounce}{Tpts(bounceNow * 100, bounceBefore is { } b2 ? b2 * 100 : null, 0)}"));
            text.Add(Lv(R("avgDurationLabel"), $"{avg}{T(avgNow, avgBefore)}"));
            text.Add(Lv(R("pagesPerVisit"), $"{Nf(ppvNow, 1)}{T(ppvNow, ppvBefore)}"));
            text.Add(Lv(R("visitsPerVisitor"), $"{Nf(vpvNow, 1)}{T(vpvNow, vpvBefore)}"));
            if (o.Goals.Count > 0)
            {
                rows.Add(k.KpiRow(o.Goals.Select(goal => new Figure(Nf(goal.Value), goal.Label, k.Trend(goal.Value, goal.Previous), Compare($"goal-{NotId().Replace(goal.Id.ToLowerInvariant(), "-")}", goal.Previous, goal.Value)))));
                foreach (var goal in o.Goals) text.Add(Lv(goal.Label, $"{Nf(goal.Value)}{T(goal.Value, goal.Previous)}"));
            }
        }
        else
        {
            var note = o.Status == "not-configured" ? R("notConfigured") : R("unavailable");
            rows.Add(k.Note(note));
            text.Add(note);
        }

        var extras = o.Extras;
        if (extras is { Tiles.Count: > 0 })
        {
            string Value(ExtraTile x) => AsNumber(x.Value) is { } n ? Nf(n) : x.Value.ToString() ?? "";
            var plain = extras.Tiles.Where(x => !x.Highlight).ToList();
            var strong = extras.Tiles.Where(x => x.Highlight).ToList();
            if (plain.Count > 0)
                rows.Add(k.KpiRow(plain.Select(x => new Figure(Value(x), x.Label, AsNumber(x.Value) is { } n ? k.Trend(n, x.Previous) : x.Sub is { Length: > 0 } sub ? MailKit.Esc(sub) : ""))));
            string Link(ExtraTile x) => x.Link is { } lk ? $" <a href=\"{MailKit.Esc(lk.Url)}\" class=\"sk-ac\" style=\"color:{c.AccentDeep}\">{MailKit.Esc(lk.Label)}</a>" : "";
            foreach (var x in strong) rows.Add(k.Callout($"<b>{MailKit.Esc(Lv(x.Label, Value(x)))}</b>{(x.Sub is { Length: > 0 } sub ? $" — {MailKit.Esc(sub)}" : "")}{Link(x)}"));
            foreach (var x in extras.Tiles) text.Add($"{Lv(x.Label, Value(x))}{(x.Sub is { Length: > 0 } sub ? $" ({sub})" : "")}{(x.Highlight && x.Link is { } go ? $" {go.Url}" : "")}");
        }
        rows.Add("<tr><td style=\"font-size:0;line-height:8px\">&nbsp;</td></tr>");

        var bestIndex = 0;
        for (var i = 0; i < ser.Pageviews.Count; i++) if (ser.Pageviews[i] > ser.Pageviews[bestIndex]) bestIndex = i;
        string Label(string slot) => Format.SlotLabel(texts, slot, ser.Unit);
        var bestDay = ok && ser.Pageviews.Count > 0 && ser.Pageviews[bestIndex] != 0
            ? Texts.Fill(R("bestDay"), V(("d", ser.Unit == "day" ? Format.LongDay(texts, ser.Slots[bestIndex]) : Label(ser.Slots[bestIndex])), ("n", Nf(ser.Pageviews[bestIndex]))))
            : "";
        var slotBest = ok ? Format.BestSlot(o.Heatmap) : null;
        var when = slotBest is { } sb ? Texts.Fill(R("slot"), V(("day", Format.WeekdayName(texts, sb.Day)), ("hour", Format.HourName(texts, sb.Hour)))) : "";
        static string Own(Item i) => i.Label ?? i.Key;
        string Source(Item i) => i.Label ?? (i.Key.Length > 0 ? i.Key : texts["common.direct"]);

        if (ok && glance)
        {
            var b = o.Breakdowns;
            string First(string template, IReadOnlyList<Item> items, Func<Item, string> name) =>
                items.Count > 0 && items[0].Value != 0 ? Texts.Fill(template, V(("label", name(items[0])), ("n", Nf(items[0].Value)))) : "";
            var lines = new[]
            {
                First(R("glanceSource"), b.Referrers, Source),
                First(R("glanceCountry"), b.Countries, i => Format.CountryName(texts, i.Key)),
                First(R("glancePage"), b.Pages, Own),
                First(R("glanceEntry"), b.Entries, Own),
                bestDay,
                when.Length > 0 ? Texts.Fill(R("glanceSlot"), V(("slot", when))) : "",
            }.Where(x => x.Length > 0).ToList();
            if (lines.Count > 0)
            {
                rows.Add(k.Card($"{k.H2(R("glanceTitle"))}{k.Bullets(lines)}"));
                text.Add("");
                text.Add(Format.Upper(R("glanceTitle")));
                text.AddRange(lines.Select(x => $"  - {x}"));
            }
        }

        // rising and falling: pages and sources that gained or lost the most against the previous period
        if (ok)
        {
            static IEnumerable<Move> Moves(IReadOnlyList<Item> items, string tag, Func<Item, string> name) =>
                items.Where(i => i.Previous is not null && i.Value != i.Previous).Select(i => new Move(name(i), tag, i.Value - (i.Previous ?? 0)));
            var pool = Moves(o.Breakdowns.Pages, R("moverPage"), Own).Concat(Moves(o.Breakdowns.Referrers, R("moverSource"), Source)).ToList();
            var up = pool.Where(m => m.D > 0).OrderByDescending(m => m.D).ThenBy(m => m.Label, Collation.Comparer).Take(4).ToList();
            var down = pool.Where(m => m.D < 0).OrderBy(m => m.D).ThenBy(m => m.Label, Collation.Comparer).Take(4).ToList();
            if (up.Count > 0 || down.Count > 0)
            {
                string Col(string title, List<Move> list, string tone) => list.Count > 0 ? $"{k.H3(title)}{k.Moves(list.Select(m => new MoveRow(m.Label, m.Tag, Nf(m.D, 0, true), tone)))}" : "";
                var a = Col(R("moversUp"), up, "up");
                var b = Col(R("moversDown"), down, "down");
                rows.Add(k.Card($"{k.H2(R("moversTitle"), R("moversHint"))}{(a.Length > 0 && b.Length > 0 ? k.Split(a, b) : a.Length > 0 ? a : b)}"));
                text.Add("");
                text.Add(Format.Upper(R("moversTitle")));
                foreach (var (title, list) in new[] { (R("moversUp"), up), (R("moversDown"), down) })
                {
                    if (list.Count == 0) continue;
                    text.Add($"  {title}");
                    text.AddRange(list.Select(m => $"    - {Lv($"{m.Label} ({m.Tag})", Nf(m.D, 0, true))}"));
                }
            }
        }

        if (ok && worldMap && o.Breakdowns.Countries.Count > 0)
        {
            var map = MapPng.Render(o.Breakdowns.Countries.Select(i => (i.Key, i.Value)), c.Map);
            attachments.Add(new InlineAttachment(MapCid, "map.png", "image/png", map.Png));
            rows.Add(k.Card($"{k.H2(R("mapTitle"), R("mapHint"))}<img src=\"cid:{MapCid}\" width=\"{MailKit.CardInner}\" alt=\"{MailKit.Esc(R("mapAlt"))}\" style=\"display:block;width:100%;max-width:{MailKit.CardInner}px;height:auto;border-radius:10px;border:0\">"));
        }

        if (ok && ser.Slots.Count > 1)
        {
            var prev = ser.PreviousPageviews;
            var titles = ser.Slots.Select((x, i) => Lv(Label(x), prev is not null ? $"{Nf(ser.Pageviews[i])} / {Nf(i < prev.Count ? prev[i] : 0)}" : Nf(ser.Pageviews[i]))).ToList();
            rows.Add(k.Card($"{k.H2(R("dailyTitle"), bestDay)}{k.Bars(ser.Pageviews, Label(ser.Slots[0]), Label(ser.Slots[^1]), titles, prev, (R("dailyCurrent"), R("dailyPrevious")))}"));
            if (bestDay.Length > 0 && !glance) { text.Add(""); text.Add(bestDay); }
        }
        if (slotBest is not null)
        {
            var days = Enumerable.Range(0, 7).Select(d => Format.WeekdayName(texts, d, true)).ToList();
            rows.Add(k.Card($"{k.H2(R("heatTitle"), Texts.Fill(R("heatHint"), V(("slot", when), ("tz", tz))))}{k.Heat(o.Heatmap, days)}"));
            text.Add(Texts.Fill(R("heatHint"), V(("slot", when), ("tz", tz))));
        }

        const string Space = "<div style=\"height:10px;line-height:10px;font-size:0\">&nbsp;</div>";

        // Google
        var g = search;
        if (g?.Status == "ok")
        {
            var gv = V(("from", Format.ShortDate(texts, g.Start)), ("to", Format.ShortDate(texts, g.End)));
            var gt = g.Totals;
            var gp = g.Previous;
            var before = gp.Impressions > 0;
            var inner = $"<div {k.Ts("13px/1.5", 400, c.Muted)}>{MailKit.Esc(R("googleNothing"))}</div>";
            text.Add("");
            text.Add($"{Format.Upper(R("googleTitle"))} ({Texts.Fill(texts["periods.short"], gv)})");
            if (gt.Impressions != 0)
            {
                inner = k.Figures([
                    new(Nf(gt.Clicks), R("googleClicks"), k.Trend(gt.Clicks, gp.Clicks)),
                    new(Nf(gt.Impressions), R("googleImpressions"), k.Trend(gt.Impressions, gp.Impressions)),
                    new(Format.Percent(texts, gt.Ctr, 1), R("googleCtr"), before ? k.Gap(gt.Ctr * 100, gp.Ctr * 100, 1, texts["common.points"], false) : "&nbsp;"),
                    new(Nf(gt.Position, 1), R("googlePosition"), before ? k.Gap(gt.Position, gp.Position, 1, null, true) : "&nbsp;"),
                ], 4);
                text.Add($"  - {Lv(R("googleClicks"), $"{Nf(gt.Clicks)}{T(gt.Clicks, gp.Clicks)}")}");
                text.Add($"  - {Lv(R("googleImpressions"), $"{Nf(gt.Impressions)}{T(gt.Impressions, gp.Impressions)}")}");
                text.Add($"  - {Lv(R("googleCtr"), $"{Format.Percent(texts, gt.Ctr, 1)}{(before ? Tpts(gt.Ctr * 100, gp.Ctr * 100, 1) : "")}")}");
                text.Add($"  - {Lv(R("googlePosition"), Nf(gt.Position, 1))}");
                var queries = g.Queries.OrderByDescending(q => q.Clicks).ThenByDescending(q => q.Impressions).ThenBy(q => q.Key, Collation.Comparer).Take(5).ToList();
                if (queries.Count > 0)
                {
                    inner += $"{Space}{k.Grid([R("googleTopQueries"), R("googleColClicks"), R("googleColImpressions")], queries.Select(q => (IReadOnlyList<string>)[MailKit.Esc(q.Key), MailKit.Esc(Nf(q.Clicks)), MailKit.Esc(Nf(q.Impressions))]))}";
                    text.Add($"  {R("googleTopQueries")}");
                    text.AddRange(queries.Select(q => $"    - {Lv(q.Key, $"{Nf(q.Clicks)} / {Nf(q.Impressions)}")}"));
                }
                var prevPages = new Dictionary<string, double>();
                foreach (var x in g.PreviousPages) prevPages[x.Key] = x.Clicks;
                var gains = g.Pages.Select(x => (Label: Format.PathOf(x.Key), D: x.Clicks - prevPages.GetValueOrDefault(x.Key))).Where(x => x.D > 0)
                    .OrderByDescending(x => x.D).ThenBy(x => x.Label, Collation.Comparer).Take(3).ToList();
                if (gains.Count > 0)
                {
                    inner += $"{Space}{k.H3(R("googlePagesUp"))}{k.Moves(gains.Select(x => new MoveRow(x.Label, "", Nf(x.D, 0, true), "up")))}";
                    text.Add($"  {R("googlePagesUp")} ({R("googlePagesUpHint")})");
                    text.AddRange(gains.Select(x => $"    - {Lv(x.Label, Nf(x.D, 0, true))}"));
                }
            }
            else
            {
                text.Add($"  - {R("googleNothing")}");
            }
            rows.Add(k.Card($"{k.H2(R("googleTitle"), Texts.Fill(R("googleHint"), gv))}{inner}{(string.IsNullOrEmpty(searchUrl) ? "" : k.Link(searchUrl, R("googleLink")))}"));
        }
        else if (g?.Status == "error")
        {
            rows.Add(k.Note(R("googleUnavailable")));
            text.Add("");
            text.Add(R("googleUnavailable"));
        }

        // YouTube
        var y = youtube;
        if (y?.Status == "ok" && y.Channel is { } channel)
        {
            var yv = V(("from", Format.ShortDate(texts, y.Start)), ("to", Format.ShortDate(texts, y.End)));
            var site = y.Site;
            var subscribers = channel.Subscribers is { } subs ? Nf(subs) : "—";
            var figs = new List<Figure>
            {
                new(Nf(y.Totals.Views), R("youtubeViews"), k.Trend(y.Totals.Views, y.Previous.Views)),
                new(Nf(y.Totals.Minutes), R("youtubeMinutes"), k.Trend(y.Totals.Minutes, y.Previous.Minutes)),
                new(subscribers, R("youtubeSubscribers"), Muted(Texts.Fill(R("youtubeBalance"), V(("gained", Nf(y.Totals.Gained)), ("lost", Nf(y.Totals.Lost)))))),
            };
            if (site?.Visits is { } sv) figs.Add(new(Nf(sv), R("youtubeSiteVisits"), k.Trend(sv, site.PreviousVisits)));
            if (site?.Requests is { } sr) figs.Add(new(Nf(sr), R("youtubeRequests"), k.Trend(sr, site.PreviousRequests)));
            var list = (videos ?? []).Where(v => v.Views > 0).ToList();
            var table = list.Count > 0
                ? $"{Space}{k.Grid([R("youtubeVideos"), R("youtubeViews")], list.Select(v => (IReadOnlyList<string>)[$"<a href=\"{MailKit.Esc(v.Url)}\" class=\"sk-ac\" style=\"color:{c.AccentDeep}\">{MailKit.Esc(v.Title)}</a>", MailKit.Esc(Nf(v.Views))]))}"
                : "";
            rows.Add(k.Card($"{k.H2(R("youtubeTitle"), Texts.Fill(R("youtubeHint"), yv))}{k.Figures(figs)}{table}{(string.IsNullOrEmpty(youtubeUrl) ? "" : k.Link(youtubeUrl, R("youtubeLink")))}"));
            text.Add("");
            text.Add($"{Format.Upper(R("youtubeTitle"))} ({Texts.Fill(texts["periods.short"], yv)})");
            text.Add($"  - {Lv(R("youtubeViews"), $"{Nf(y.Totals.Views)}{T(y.Totals.Views, y.Previous.Views)}")}");
            text.Add($"  - {Lv(R("youtubeMinutes"), $"{Nf(y.Totals.Minutes)}{T(y.Totals.Minutes, y.Previous.Minutes)}")}");
            text.Add($"  - {Lv(R("youtubeSubscribers"), subscribers)}");
            if (site?.Visits is { } sv2) text.Add($"  - {Lv(R("youtubeSiteVisits"), Nf(sv2))}");
            if (site?.Requests is { } sr2) text.Add($"  - {Lv(R("youtubeRequests"), Nf(sr2))}");
            if (list.Count > 0)
            {
                text.Add($"  {R("youtubeVideos")} ({R("youtubeVideosHint")})");
                text.AddRange(list.Select(v => $"    - {Lv(v.Title, Nf(v.Views))} {v.Url}"));
            }
        }
        else if (y?.Status == "error")
        {
            rows.Add(k.Note(R("youtubeUnavailable")));
            text.Add("");
            text.Add(R("youtubeUnavailable"));
        }

        // rankings
        var lists = new List<(string Title, List<(string, double)> Rows, string Hint)>();
        static List<(string, double)> Top(IReadOnlyList<Item>? items, Func<Item, string> label, int n = 6) => [.. (items ?? []).Take(n).Select(i => (label(i), i.Value))];
        if (ok)
        {
            var b = o.Breakdowns;
            lists.Add((R("pages"), Top(b.Pages, Own), ""));
            lists.Add((R("referrers"), Top(b.Referrers, Source), ""));
            lists.Add((R("countries"), Top(b.Countries, i => Format.CountryName(texts, i.Key)), ""));
            lists.Add((R("cities"), Top(b.Cities, Own), ""));
            lists.Add((R("entries"), Top(b.Entries, Own), R("entriesHint")));
            lists.Add((R("exits"), Top(b.Exits, Own), R("exitsHint")));
            lists.Add((R("events"), Top(b.Events, Own), R("eventsHint")));
            foreach (var grp in o.Groups) lists.Add((grp.Title, Top(grp.Items, Own), ""));
            // browser languages, in visitors ("fr-FR" and "fr" together); the language of the pages viewed apart, in pages
            lists.Add((R("languages"), Top(Format.MergeLanguages(b.Languages), i => Format.LanguageName(texts, i.Key)), R("languagesHint")));
            if (b.SiteLanguages.Count > 0) lists.Add((R("siteLanguages"), Top(b.SiteLanguages, i => Format.LanguageName(texts, i.Key)), R("siteLanguagesHint")));
            lists.Add((R("devices"), Top(b.Devices, i => Format.DeviceName(texts, i.Key)), ""));
            lists.Add((R("browsers"), Top(b.Browsers, i => i.Label ?? Format.BrowserName(i.Key)), ""));
        }
        foreach (var tb in extras?.Tables ?? []) lists.Add((tb.Title, Top(tb.Items, Own), tb.Sub ?? ""));
        if (g?.Status == "ok" && g.Totals.Impressions != 0)
            lists.Add((R("googleCountries"), [.. g.Countries.OrderByDescending(x => x.Impressions).Take(4).Select(x => (Format.CountryName(texts, x.Key), x.Impressions))], R("googleCountriesHint")));
        var shown = lists.Select(x => k.List(x.Title, x.Rows, x.Hint)).ToList();
        rows.Add(k.Pairs(shown.Select(x => x.Inner)));
        foreach (var x in shown) if (x.Text.Length > 0) text.Add(x.Text.TrimEnd());

        // site-specific cards: a light line of figures, then the lines
        foreach (var blk in blocks ?? [])
        {
            var figures = blk.Figures ?? [];
            var lines = blk.Lines ?? [];
            var figs = figures.Count > 0 ? k.Figures([.. figures.Select(f => new Figure(f.Value, f.Label, f.Sub is { Length: > 0 } sub ? Muted(sub) : ""))]) : "";
            rows.Add(k.Card($"{k.H2(blk.Title, blk.Hint ?? "")}{figs}{(lines.Count > 0 ? k.Bullets(lines) : "")}"));
            text.Add("");
            text.Add(Format.Upper(blk.Title));
            text.AddRange(figures.Select(f => $"  - {Lv(f.Label, f.Value)}{(f.Sub is { Length: > 0 } sub ? $" ({sub})" : "")}"));
            text.AddRange(lines.Select(x => $"  - {x}"));
        }

        if (!string.IsNullOrEmpty(statsUrl))
        {
            rows.Add(k.Button(statsUrl, R("button")));
            text.Add("");
            text.Add(Texts.Fill(R("textLink"), V(("url", statsUrl))));
        }
        else if (!string.IsNullOrEmpty(o.DashboardUrl))
        {
            rows.Add(k.Button(o.DashboardUrl, R("dashboardButton")));
            text.Add("");
            text.Add(Texts.Fill(R("textLink"), V(("url", o.DashboardUrl))));
        }
        if (R("footer").Length > 0)
        {
            rows.Add(k.Footer(Texts.Fill(R("footer"), vars)));
            text.Add("");
            text.Add(Texts.Fill(R("footer"), vars));
        }

        // with figures when there are some; a variable without value ({change} without a previous period) leaves no empty brackets
        var subjectTemplate = ok ? (weekly ? R("subjectWeekly") : R("subject")) : (weekly ? R("subjectWeeklyEmpty") : R("subjectEmpty"));
        var subject = Spaces().Replace(EmptyBrackets().Replace(Texts.Fill(subjectTemplate, vars), ""), " ").Trim();
        var pre = ok ? headline : Texts.Fill(R("preheaderEmpty"), vars);
        return new ReportMessage(subject, k.Page(subject, pre, string.Join("\n", rows)), BlankLines().Replace(string.Join("\n", text), "\n\n") + "\n", attachments);
    }
}
