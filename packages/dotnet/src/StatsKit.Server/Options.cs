using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using StatsKit.Report;

namespace StatsKit;

/// <summary>Settings of a stats-kit server (one site).</summary>
public sealed class StatsKitOptions
{
    /// <summary>Site name (header and subject of the report).</summary>
    public string SiteName { get; set; } = "";
    /// <summary>Language of the texts: "en" (default), "fr", "de", "es", "it", "pt", "nl", "ru", "zh", "ja", "ko", or a regional tag ("fr-CH").</summary>
    public string Locale { get; set; } = "en";
    /// <summary>Text overrides, by path: <c>Texts["report.footer"] = "Sent every Monday."</c>.</summary>
    public Dictionary<string, string> Texts { get; } = [];
    /// <summary>Complete texts of a language the library does not ship (same shape as the English texts).</summary>
    public JsonObject? BaseTexts { get; set; }
    /// <summary>IANA time zone of the slots and of the report ("Europe/Paris"); UTC by default.</summary>
    public string TimeZone { get; set; } = "UTC";
    /// <summary>Umami connector; null: reported as not configured.</summary>
    public UmamiOptions? Umami { get; set; }
    /// <summary>Settings of the site pages.</summary>
    public PagesOptions Pages { get; set; } = new();
    /// <summary>Labels of the tracked events (name → label).</summary>
    public Dictionary<string, string> EventLabels { get; } = [];
    /// <summary>Goals: total of one or more events.</summary>
    public List<GoalOptions> Goals { get; } = [];
    /// <summary>Site's own data (its database), added to the overview and the report; shown even without Umami.</summary>
    public Func<Range, CancellationToken, Task<Extras?>>? Extras { get; set; }
    /// <summary>Number of rows kept per ranking (30 by default).</summary>
    public int Limit { get; set; } = 30;
    /// <summary>E-mail report.</summary>
    public ReportOptions Report { get; set; } = new();
    /// <summary>Time to live of the overview cache (2 minutes by default).</summary>
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(2);
    /// <summary>Clock (tests).</summary>
    public TimeProvider Clock { get; set; } = TimeProvider.System;
    /// <summary>Draws the world map of the report (true by default).</summary>
    public bool WorldMap { get; set; } = true;
}

/// <summary>Settings of the site pages.</summary>
public sealed class PagesOptions
{
    /// <summary>Language prefixes ("fr", "en"): /fr/contact and /en/contact count as /contact; paths without a prefix are ignored.</summary>
    public List<string> Languages { get; set; } = [];
    /// <summary>Paths to ignore. Default: /admin and /api.</summary>
    public Regex? Exclude { get; set; }
    /// <summary>Page labels, by logical path ("/contact" → "Contact").</summary>
    public Dictionary<string, string> Labels { get; set; } = [];
    /// <summary>Label of a page computed by the site (used when <see cref="Labels"/> has none).</summary>
    public Func<string, string?>? Label { get; set; }
    /// <summary>Groups: the first group of the pattern (applied to the logical path) gives the key.</summary>
    public List<PageGroup> Groups { get; set; } = [];
}

/// <summary>Group of pages (product pages, articles…).</summary>
public sealed record PageGroup(string Id, string Title, Regex Pattern, IReadOnlyDictionary<string, string>? Labels = null, int Limit = 15);

/// <summary>Goal: total of one or more tracked events.</summary>
public sealed record GoalOptions(string Id, string Label, IReadOnlyList<string> Events);

/// <summary>E-mail report.</summary>
public sealed class ReportOptions
{
    /// <summary>Colours and logo (default: neutral blue).</summary>
    public ReportTheme Theme { get; set; } = new();
    /// <summary>Statistics page of the administration, opened by the report button.</summary>
    public string? StatsUrl { get; set; }
    /// <summary>Days covered by default (7).</summary>
    public int Days { get; set; } = 7;
    /// <summary>
    /// Sending of the message, done by the site (SMTP, Microsoft Graph…): the library sends nothing itself. Returns the number of
    /// recipients. Without it, the send route answers 503.
    /// </summary>
    public Func<ReportMessage, CancellationToken, Task<int>>? Send { get; set; }
    /// <summary>Adds the "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default).</summary>
    public bool Glance { get; set; } = true;
    /// <summary>
    /// Site-specific cards (costs, requests, news…), shown after the rankings; given in the site's language. A failure of this
    /// function is logged and the report is sent without these cards.
    /// </summary>
    public Func<StatsOverview, CancellationToken, Task<IReadOnlyList<ReportBlock>>>? Blocks { get; set; }
}

/// <summary>Colours, fonts and logo of the e-mail report. Only <see cref="Brand"/> matters: the other shades derive from it.</summary>
public sealed class ReportTheme
{
    /// <summary>Brand colour, "#rrggbb": header, bars, buttons.</summary>
    public string Brand { get; set; } = "#2f5bd3";
    /// <summary>Header colour (default: <see cref="Brand"/>).</summary>
    public string? Head { get; set; }
    /// <summary>Background of a highlighted site tile's line (requests to handle…), "#rrggbb" (default: amber).</summary>
    public string? WarnSoft { get; set; }
    /// <summary>Text of a highlighted site tile's line (default: dark amber).</summary>
    public string? WarnInk { get; set; }
    /// <summary>Header text.</summary>
    public string? HeadText { get; set; }
    /// <summary>Header secondary text.</summary>
    public string? HeadMuted { get; set; }
    /// <summary>Header small title.</summary>
    public string? Eyebrow { get; set; }
    /// <summary>Ranking bars (default: lightened brand).</summary>
    public string? Accent { get; set; }
    /// <summary>Background of the lightly loaded heatmap cells.</summary>
    public string? Soft { get; set; }
    /// <summary>Titles and figures.</summary>
    public string? Ink { get; set; }
    /// <summary>Text.</summary>
    public string? Text { get; set; }
    /// <summary>Secondary text.</summary>
    public string? Muted { get; set; }
    /// <summary>Borders.</summary>
    public string? Line { get; set; }
    /// <summary>Page background.</summary>
    public string? Page { get; set; }
    /// <summary>Card background.</summary>
    public string? Card { get; set; }
    /// <summary>Rise.</summary>
    public string? Up { get; set; }
    /// <summary>Fall.</summary>
    public string? Down { get; set; }
    /// <summary>Font stack of the text.</summary>
    public string? Font { get; set; }
    /// <summary>Font stack of titles and figures.</summary>
    public string? Display { get; set; }
    /// <summary>Header logo.</summary>
    public ReportLogo? Logo { get; set; }
}

/// <summary>Header logo: PNG attached to the message (<see cref="Png"/>) or online image (<see cref="Url"/>).</summary>
public sealed record ReportLogo(byte[]? Png = null, string? Url = null, int? Width = null, int? Height = null, string? Alt = null);
