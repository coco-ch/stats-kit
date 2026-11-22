// Fields are documented in docs/CONTRACT.md (same names, camelCase in JSON).
#pragma warning disable CS1591
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StatsKit;

// Data contract of stats-kit (docs/CONTRACT.md, packages/contract/src/types.ts): what the routes return and what the Angular
// components display. Every number is a JSON number (double, as in JavaScript); an unknown value is null, never missing.

/// <summary>Period shown and previous period of the same length.</summary>
public sealed record Range(string From, string To, double Days, string Unit, string TimeZone, string PreviousFrom, string PreviousTo);

/// <summary>Totals of a period.</summary>
public sealed record Totals(double Pageviews, double Visitors, double Visits, double Bounces, double Totaltime)
{
    internal static Totals Zero => new(0, 0, 0, 0, 0);
}

/// <summary>Row of a ranking (page, country, source…).</summary>
public sealed record Item(string Key, string? Label, double Value, double? Previous);

/// <summary>Continuous time series: one slot per day or hour of the period.</summary>
public sealed record Series(string Unit, IReadOnlyList<string> Slots, IReadOnlyList<double> Pageviews, IReadOnlyList<double> Visitors, IReadOnlyList<double>? PreviousPageviews);

/// <summary>Detail of a page.</summary>
public sealed record PageRow
{
    public required string Key { get; init; }
    public string? Label { get; init; }
    public double Views { get; set; }
    public double Visitors { get; set; }
    public double Entries { get; set; }
    public double Exits { get; set; }
    public double Bounces { get; set; }
    public double Totaltime { get; set; }
    public double? PreviousViews { get; set; }
}

/// <summary>Recent visit, without identifying the person.</summary>
public sealed record Session(string? Country, string? City, string? Device, string? Browser, string? Os, double Views, string? LastAt);

/// <summary>Goal of the site: total of one or more tracked events.</summary>
public sealed record Goal(string Id, string Label, double Value, double? Previous);

/// <summary>Group of pages defined by the site.</summary>
public sealed record ItemGroup(string Id, string Title, IReadOnlyList<Item> Items);

/// <summary>Where to act on a site tile (the site's list of requests…): under the figure on the page, at the end of its line in the report.</summary>
public sealed record ExtraLink(string Url, string Label);

/// <summary>Figure tile added by the site (data from its own database).</summary>
/// <param name="Value">A number (<see cref="double"/>, <see cref="int"/>, <see cref="decimal"/>…) or a text already formatted.</param>
/// <param name="Link">Optional; left out of the JSON when null.</param>
public sealed record ExtraTile(string Id, string Label, object Value, double? Previous = null, string? Sub = null, string? Group = null, bool Highlight = false,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] ExtraLink? Link = null);

/// <summary>Table added by the site. <paramref name="Section"/>: pages, sources, audience or actions.</summary>
public sealed record ExtraTable(string Id, string Title, string? Sub, string Head, string Column, string Section, IReadOnlyList<Item> Items);

/// <summary>Last step of the funnel.</summary>
public sealed record FunnelStep(string Label, double Value);

/// <summary>Site's own data, shown with the sources' data (shown even if Umami does not answer).</summary>
public sealed record Extras(IReadOnlyList<ExtraTile> Tiles, IReadOnlyList<ExtraTable> Tables, FunnelStep? Funnel = null);

/// <summary>Rankings of a period, each sorted by decreasing value.</summary>
public sealed record Breakdowns(
    IReadOnlyList<Item> Pages, IReadOnlyList<Item> Entries, IReadOnlyList<Item> Exits, IReadOnlyList<Item> Referrers, IReadOnlyList<Item> Channels,
    IReadOnlyList<Item> Countries, IReadOnlyList<Item> Regions, IReadOnlyList<Item> Cities, IReadOnlyList<Item> Languages, IReadOnlyList<Item> SiteLanguages,
    IReadOnlyList<Item> Devices, IReadOnlyList<Item> Browsers, IReadOnlyList<Item> Os, IReadOnlyList<Item> Screens, IReadOnlyList<Item> Events,
    IReadOnlyList<Item> Hostnames, IReadOnlyList<Item> UtmSources, IReadOnlyList<Item> UtmMediums, IReadOnlyList<Item> UtmCampaigns)
{
    internal static Breakdowns Empty => new([], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []);
}

/// <summary>Number of distinct dimensions over the period.</summary>
public sealed record Counts(double? Countries, double? Events);

/// <summary>Response of <c>GET {base}/overview</c>: everything the Statistics page shows.</summary>
public sealed record StatsOverview(
    int Version, string Status, string? Error, string GeneratedAt, Range Range, Totals Totals, Totals? Previous, double? Active,
    Series Series, Series Last24h, IReadOnlyList<IReadOnlyList<double>> Heatmap, Breakdowns Breakdowns, IReadOnlyList<PageRow> Pages,
    IReadOnlyList<ItemGroup> Groups, IReadOnlyList<Goal> Goals, Counts Counts, IReadOnlyList<Session> Sessions, Extras? Extras,
    IReadOnlyDictionary<string, List<double>>? EventSeries, string? DashboardUrl);

/// <summary>Search Console totals: clicks, impressions, click-through rate (0 to 1), average position (0 without impressions).</summary>
public sealed record SearchTotals(double Clicks, double Impressions, double Ctr, double Position);

/// <summary>Row of a Search Console ranking: query, page address, country (ISO alpha-3, lower case)…</summary>
public sealed record SearchRow(string Key, double Clicks, double Impressions, double Ctr, double Position);

/// <summary>
/// Performance in Google Search (<c>GET {base}/search</c> of the Node server), the fields the report reads; the other fields of
/// the contract are ignored when it is read from JSON (<see cref="ContractJson.Deserialize{T}"/>). Days are "YYYY-MM-DD".
/// </summary>
public sealed record SearchOverview(
    string Status, string Start, string End, SearchTotals Totals, SearchTotals Previous, IReadOnlyList<SearchRow> Queries,
    IReadOnlyList<SearchRow> Pages, IReadOnlyList<SearchRow> PreviousPages, IReadOnlyList<SearchRow> Countries);

/// <summary>YouTube channel (the fields the report reads); <see cref="Subscribers"/> null if the channel hides it.</summary>
public sealed record YoutubeChannel(string Id, string Title, string Url, double? Subscribers);

/// <summary>YouTube totals of a period: views, minutes watched, subscribers gained and lost.</summary>
public sealed record YoutubeTotals(double Views, double Minutes, double Gained, double Lost);

/// <summary>What the channel brings to the site: visits through a tracked link and the requests that follow (null: not counted).</summary>
public sealed record YoutubeSite(double? Visits, double? PreviousVisits, double? Requests, double? PreviousRequests);

/// <summary>YouTube channel and its statistics (<c>GET {base}/youtube</c> of the Node server), the fields the report reads.</summary>
public sealed record YoutubeOverview(string Status, string Start, string End, YoutubeChannel? Channel, YoutubeTotals Totals, YoutubeTotals Previous, YoutubeSite? Site);

/// <summary>Video of the report: title (or the site's label), address, views over the period.</summary>
public sealed record ReportVideo(string Title, string Url, double Views);

/// <summary>Response of <c>GET {base}/live</c>: active visitors.</summary>
public sealed record LiveResponse(int Version, double? Active, string At);

/// <summary>Response of <c>GET {base}/report/preview</c>.</summary>
public sealed record ReportPreview(int Version, string Subject, string Html, string Text);

/// <summary>Response of <c>POST {base}/report/send</c>.</summary>
public sealed record ReportSendResult(int Version, bool Ok, int Recipients, string? Error);

/// <summary>JSON settings of the contract: camelCase, nulls written, characters kept as is.</summary>
public static class ContractJson
{
    /// <summary>Serializer options producing the same JSON as the Node server.</summary>
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        NumberHandling = JsonNumberHandling.Strict,
    };

    /// <summary>Serializes a response of the contract.</summary>
    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    /// <summary>Reads a response of the contract (JSON of the Node server, for instance its Search Console or YouTube answer).</summary>
    public static T? Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options);
}
