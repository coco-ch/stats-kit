using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using StatsKit.Report;

namespace StatsKit;

/// <summary>HTTP request reduced to what the routes need.</summary>
/// <param name="Path">Path relative to the mount point ("/overview").</param>
public sealed record KitRequest(string Method, string Path, IReadOnlyDictionary<string, string> Query);

/// <summary>Answer of a route.</summary>
public sealed record KitResponse(int Status, IReadOnlyDictionary<string, string> Headers, string Body);

/// <summary>
/// stats-kit server for one site: Umami connector, cache, overview, live count, e-mail report and its preview, HTTP routes.
/// Same data contract and same routes as the Node server (<c>stats-kit/server</c>), for the stats-kit Angular components.
/// Search Console and YouTube are not connected by this server yet: their routes answer "not configured".
/// </summary>
public sealed class StatsKitServer
{
    private readonly StatsKitOptions _options;
    private readonly Cache _cache;
    private readonly ILogger _logger;
    private readonly string? _dashboardUrl;

    /// <summary>Texts of the chosen language, with the site's overrides.</summary>
    public Texts Texts { get; }

    /// <summary>Umami connector (null if not configured), for the site's own queries.</summary>
    public UmamiClient? Umami { get; }

    /// <summary>Settings.</summary>
    public StatsKitOptions Options => _options;

    /// <summary>Creates the server. <paramref name="http"/> is used for the calls to Umami (one is created if absent).</summary>
    public StatsKitServer(StatsKitOptions options, HttpClient? http = null, ILogger? logger = null)
    {
        _options = options;
        _logger = logger ?? NullLogger.Instance;
        Texts = Texts.Create(options.Locale, options.Texts, options.BaseTexts);
        _cache = new Cache(Now);
        if (options.Umami is { IsConfigured: true } u)
        {
            // the warning names neither the password nor the account it was given
            if (u.UsesDefaultAccount) _logger.LogWarning("[stats-kit] Umami: the connector signs in with the default account of a new Umami. Change its password and use a read-only account (README, \"Securing a new Umami\").");
            Umami = new UmamiClient(u, http ?? new HttpClient());
            if (!u.HideDashboard) _dashboardUrl = string.IsNullOrEmpty(u.DashboardUrl) ? $"{u.Url.TrimEnd('/')}/websites/{u.WebsiteId}" : u.DashboardUrl;
        }
    }

    private double Now() => _options.Clock.GetUtcNow().ToUnixTimeMilliseconds();

    /// <summary>Overview of a period (cached for <see cref="StatsKitOptions.CacheTtl"/>; an answer in error is not kept).</summary>
    public async Task<StatsOverview> OverviewAsync(RangeQuery? q = null, CancellationToken ct = default)
    {
        q ??= new RangeQuery();
        var now = Now();
        var range = Time.ResolveRange(q, _options.TimeZone, now);
        var key = q.From is not null ? $"r:{range.From}:{range.To}" : $"d:{Js.Str(range.Days)}";
        var o = await _cache.GetAsync($"overview:{key}", _options.CacheTtl.TotalMilliseconds,
            () => Overview.BuildAsync(Umami, range, _options, _dashboardUrl, now, _logger, ct, withExtras: false), x => x.Status != "error").ConfigureAwait(false);
        // the site's own data (its database) is read at every call, never kept with Umami's figures
        return o with { Extras = await Overview.SiteExtrasAsync(_options, range, _logger, ct).ConfigureAwait(false) }; // the period as of now
    }

    /// <summary>Visitors active right now.</summary>
    public async Task<LiveResponse> LiveAsync(CancellationToken ct = default)
    {
        double? active = null;
        if (Umami is not null)
        {
            try
            {
                var a = await Umami.GetAsync("active", null, ct).ConfigureAwait(false);
                active = UmamiClient.Num(UmamiClient.At(a, "visitors") ?? UmamiClient.At(a, "x"));
            }
            catch (Exception) when (!ct.IsCancellationRequested)
            {
                active = null;
            }
        }
        return new LiveResponse(1, active, Js.Iso(Now()));
    }

    /// <summary>Report of the last days (7 by default, see <see cref="ReportOptions.Days"/>).</summary>
    public async Task<ReportMessage> ReportAsync(RangeQuery? q = null, bool weekly = false, CancellationToken ct = default)
    {
        q ??= new RangeQuery();
        var r = _options.Report;
        var days = q.Days ?? (!string.IsNullOrEmpty(q.From) ? null : Js.Str(r.Days));
        var o = await OverviewAsync(q with { Days = days }, ct).ConfigureAwait(false);
        IReadOnlyList<ReportBlock> blocks = [];
        if (r.Blocks is not null)
        {
            try
            {
                blocks = await r.Blocks(o, ct).ConfigureAwait(false);
            }
            catch (Exception e) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(e, "[stats-kit] report blocks");
            }
        }
        ReportBusiness? business = null;
        if (r.Business is not null)
        {
            try
            {
                business = await r.Business(o, ct).ConfigureAwait(false);
            }
            catch (Exception e) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(e, "[stats-kit] report business figures");
            }
        }
        ReportSources? sources = null;
        if (r.Sources is not null)
        {
            try
            {
                sources = await r.Sources(o.Range, ct).ConfigureAwait(false);
            }
            catch (Exception e) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(e, "[stats-kit] report sources");
            }
        }
        var texts = Texts;
        if (r.Texts is not null && await r.Texts(ct).ConfigureAwait(false) is { Count: > 0 } extra)
        {
            // texts read again at every report, over those given at start-up
            var merged = new Dictionary<string, string>(_options.Texts);
            foreach (var (path, value) in extra) merged[path] = value;
            texts = Texts.Create(_options.Locale, merged, _options.BaseTexts);
        }
        // visits and bounces day by day, occurrences of the goals: the charts of these figures
        var daily = Umami is null ? null : await Daily.VisitsAsync(Umami, o, ct).ConfigureAwait(false);
        return ReportBuilder.Build(o, texts, r.Theme, _options.SiteName, r.StatsUrl, weekly, _options.WorldMap, r.Glance, blocks,
            sources?.Search, sources?.Youtube, sources?.Videos, r.SearchUrl, r.YoutubeUrl, daily, Daily.GoalSeries(o, _options.Goals), business);
    }

    /// <summary>Builds the report and hands it to <see cref="ReportOptions.Send"/>.</summary>
    public async Task<ReportSendResult> SendReportAsync(RangeQuery? q = null, bool weekly = false, CancellationToken ct = default)
    {
        var send = _options.Report.Send;
        if (send is null) return new ReportSendResult(1, false, 0, "send-not-configured");
        try
        {
            var n = await send(await ReportAsync(q, weekly, ct).ConfigureAwait(false), ct).ConfigureAwait(false);
            return new ReportSendResult(1, true, n, null);
        }
        catch (Exception e)
        {
            return new ReportSendResult(1, false, 0, Overview.ErrorMessage(e));
        }
    }

    private string Iso() => Js.Iso(Now());

    /// <summary>Search Console: not connected by the .NET server (same answer as the Node server without settings).</summary>
    public JsonObject Search(RangeQuery? q = null)
    {
        var now = Now();
        var lastDay = Math.Floor((now - 2 * Time.Day) / Time.Day) * Time.Day;
        var asked = Math.Floor(Js.Number(q?.Days));
        var n = double.IsFinite(asked) && asked >= 1 ? Math.Min(asked, 480) : 28;
        string Ymd(double ms) => Js.Iso(ms)[..10];
        var start = lastDay - (n - 1) * Time.Day;
        if (q?.From is { } f && q.To is { } t && DayPattern(f) && DayPattern(t))
        {
            var s = Js.ParseInstant(f + "T00:00:00Z");
            var e = Math.Min(Js.ParseInstant(t + "T00:00:00Z"), lastDay);
            if (e >= s && e - s <= 480 * Time.Day)
            {
                n = Js.Round((e - s) / Time.Day) + 1;
                start = s;
                lastDay = e;
            }
        }
        static JsonObject Zero() => new() { ["clicks"] = 0, ["impressions"] = 0, ["ctr"] = 0, ["position"] = 0 };
        return new JsonObject
        {
            ["version"] = 1, ["status"] = "not-configured", ["error"] = null, ["generatedAt"] = Js.Iso(now), ["property"] = null, ["serviceAccount"] = null,
            ["days"] = n, ["start"] = Ymd(start), ["end"] = Ymd(lastDay), ["previousStart"] = Ymd(start - n * Time.Day), ["previousEnd"] = Ymd(start - Time.Day),
            ["totals"] = Zero(), ["previous"] = Zero(), ["series"] = new JsonArray(), ["previousSeries"] = new JsonArray(), ["queries"] = new JsonArray(),
            ["previousQueries"] = new JsonArray(), ["pages"] = new JsonArray(), ["previousPages"] = new JsonArray(), ["countries"] = new JsonArray(),
            ["previousCountries"] = new JsonArray(), ["devices"] = new JsonArray(), ["previousDevices"] = new JsonArray(), ["appearance"] = new JsonArray(),
            ["queryPages"] = new JsonArray(), ["sitemaps"] = null, ["brandTerms"] = new JsonArray(),
        };
    }

    private static bool DayPattern(string s) => s.Length == 10 && DateOnly.TryParseExact(s, "yyyy-MM-dd", out _) || System.Text.RegularExpressions.Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}$");

    /// <summary>Indexing check: not connected by the .NET server.</summary>
    public JsonObject Indexation() => new() { ["version"] = 1, ["status"] = "not-configured", ["error"] = null, ["checkedAt"] = Iso(), ["total"] = 0, ["indexed"] = 0, ["pages"] = new JsonArray() };

    /// <summary>YouTube channel: not connected by the .NET server.</summary>
    public JsonObject Youtube(double days = 28)
    {
        static JsonObject Zero() => new() { ["views"] = 0, ["minutes"] = 0, ["gained"] = 0, ["lost"] = 0, ["averageViewDuration"] = 0 };
        return new JsonObject
        {
            ["version"] = 1, ["status"] = "not-configured", ["error"] = null, ["generatedAt"] = Iso(), ["channelUrl"] = null, ["channel"] = null, ["videos"] = new JsonArray(),
            ["days"] = days, ["start"] = "", ["end"] = "", ["totals"] = Zero(), ["previous"] = Zero(), ["series"] = new JsonArray(), ["traffic"] = new JsonArray(),
            ["analyticsError"] = null, ["site"] = null,
        };
    }

    private static KitResponse Raw(int status, string body, int maxAge = 0) => new(status, new Dictionary<string, string>
    {
        ["Content-Type"] = "application/json; charset=utf-8",
        ["Cache-Control"] = maxAge > 0 ? $"private, max-age={maxAge}" : "no-store",
        ["X-Content-Type-Options"] = "nosniff",
    }, body);

    private static KitResponse Json<T>(int status, T body) => Raw(status, ContractJson.Serialize(body));

    /// <summary>Answers a route: GET /overview, /live, /search, /search/indexation, /youtube, /report/preview, /world.json; POST /report/send.</summary>
    public async Task<KitResponse> HandleAsync(KitRequest req, CancellationToken ct = default)
    {
        var path = req.Path.TrimEnd('/');
        if (path.Length == 0) path = "/";
        string? Q(string k) => req.Query.TryGetValue(k, out var v) ? v : null;
        var range = new RangeQuery(Q("days"), Q("from"), Q("to"));
        var method = req.Method.ToUpperInvariant();
        try
        {
            if (method == "GET")
            {
                switch (path)
                {
                    case "/":
                    case "/overview": return Json(200, await OverviewAsync(range, ct).ConfigureAwait(false));
                    case "/live": return Json(200, await LiveAsync(ct).ConfigureAwait(false));
                    case "/search": return Json(200, Search(range));
                    case "/search/indexation": return Json(200, Indexation());
                    case "/youtube":
                        {
                            var d = Js.Number(Q("days"));
                            return Json(200, Youtube(double.IsNaN(d) || d == 0 ? 28 : d));
                        }
                    case "/report/preview":
                        {
                            var m = await ReportAsync(range, false, ct).ConfigureAwait(false);
                            return Json(200, new ReportPreview(1, m.Subject, m.PreviewHtml, m.Text));
                        }
                    case "/world.json":
                        return _options.WorldMap
                            ? new KitResponse(200, new Dictionary<string, string> { ["Content-Type"] = "application/json; charset=utf-8", ["Cache-Control"] = "public, max-age=604800" }, MapPng.WorldJson)
                            : Json(404, new { error = "not-found" });
                }
            }
            if (method == "POST" && path == "/report/send")
            {
                var r = await SendReportAsync(range, false, ct).ConfigureAwait(false);
                return Json(r.Ok ? 200 : r.Error == "send-not-configured" ? 503 : 502, r);
            }
            return Json(404, new { error = "not-found" });
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            _logger.LogError(e, "[stats-kit]");
            return Json(500, new { error = "internal-error" });
        }
    }
}
