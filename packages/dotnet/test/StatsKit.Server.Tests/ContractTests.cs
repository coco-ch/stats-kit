using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using StatsKit;
using StatsKit.Report;

namespace StatsKit.Tests;

/// <summary>
/// The .NET server against the Node server: the same requests, on the same simulated Umami (calls recorded by
/// scripts/dotnet-golden.ts), must give the same answers: status, headers, JSON, report (HTML, text, subject) and map pixels.
/// </summary>
public class ContractTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-16T10:30:00Z");

    private static UmamiOptions Umami() => new() { Url = "https://umami.example.test", WebsiteId = "site-demo", Username = "reader", Password = "demo-password" };

    private static readonly Extras SiteExtras = new(
        [
            new ExtraTile("usage", "AI usage (7 d)", 12.5, 10, null, "Costs", false),
            new ExtraTile("subscriptions", "Subscriptions / month", "30.00 EUR", null, "Recurring costs", "Costs", false),
            new ExtraTile("pending", "Requests to handle", 3, null, "since Monday", null, true),
        ],
        [new ExtraTable("providers", "AI usage by provider", "Over the period", "Provider", "Cost", "actions", [new Item("anthropic", "Anthropic", 9.25, null), new Item("openai", "OpenAI", 3.25, null)])],
        new FunnelStep("Requests received", 12));

    private static readonly IReadOnlyList<ReportBlock> Blocks =
    [
        new("Costs", "Over the period", [new("12.50 EUR", "AI usage", "7 days"), new("30.00 EUR", "Subscriptions / month"), new("3", "Invoices"), new("1", "Alerts", "to check")], ["Anthropic: 9.25 EUR", "OpenAI: 3.25 EUR"]),
        new("News", Lines: ["Concert on Saturday \"Brass & Winds\" <live>"]),
    ];

    /// <summary>Same business figures as the Node fixtures (scripts/dotnet-golden.ts).</summary>
    private static ReportBusiness? Business(StatsOverview o) => o.Range.Days > 30 ? null : new ReportBusiness(
        [
            new("Requests", "Quote requests", 5, 2, Group: "Requests", Series: [0, 1, 0, 2, 1, 0, 1]),
            new("to-handle", "To handle", 2, Highlight: true, Group: "Requests", Sub: "oldest: 3 days", Link: new("https://www.example.test/admin/requests", "Open the requests →")),
            new("customers", "Customers", 12, 12, Group: "Customers", Sub: "3 in trial"),
            new("revenue", "Monthly revenue", 1490, 1290, Currency: "EUR", Group: "Customers"),
            new("costs", "Costs this month", 43.5, 40, Currency: "USD", LowerIsBetter: true, Group: "Customers", Series: [40, 41.5, 43.5]),
            new("ratio", "Documents signed", "21 / 26"),
            new("new", "New accounts", 0, 0),
        ],
        Hint: o.Range.Days == 1 ? null : "From the shop database",
        Status: o.Range.Days == 1 ? new BusinessStatus("ok", "All services are running") : new BusinessStatus(o.Range.Days == 7 ? "warn" : "down", "Services to check", ["Backup <late>", "Disk 91 % full"]),
        Link: o.Range.Days == 1 ? null : new ReportLink("https://www.example.test/admin", "Open the administration →"));

    private static StatsKitOptions Full(string locale)
    {
        var o = new StatsKitOptions
        {
            SiteName = "Example Workshop", TimeZone = "Europe/Paris", Locale = locale, Umami = Umami(),
            Pages = new PagesOptions
            {
                Languages = ["en", "fr", "de"], Labels = new() { ["/"] = "Home", ["/contact"] = "Contact" },
                Groups = [new PageGroup("products", "Product pages", new Regex("^/products/([a-z0-9-]+)$"))],
            },
            Extras = (_, _) => Task.FromResult<Extras?>(SiteExtras),
            Report = new ReportOptions
            {
                Theme = new ReportTheme { Brand = "#b87333", Head = "#1a1a1d", Display = "Georgia,serif", Map = new MapTheme { Land = "#e4ded3" }, Dark = new DarkTheme { Accent = "#e0a46b" } },
                StatsUrl = "https://www.example.test/admin/statistics", Send = (_, _) => Task.FromResult(2), Blocks = (_, _) => Task.FromResult(Blocks),
                Business = (o, _) => Task.FromResult(Business(o)),
                SearchUrl = "https://www.example.test/admin/google", YoutubeUrl = "https://www.example.test/admin/youtube",
            },
        };
        o.EventLabels["phone-click"] = "Click to call";
        o.Goals.Add(new GoalOptions("calls", "Clicks to call", ["phone-click"]));
        return o;
    }

    /// <summary>Google and YouTube figures the Node report used, given to the .NET server (it does not connect to them itself).</summary>
    private static void WithSources(StatsKitOptions o, JsonObject golden)
    {
        if (golden["sources"] is not JsonObject sources) return;
        o.Report.Sources = (range, _) =>
        {
            var s = (JsonObject)sources[Js.Str(range.Days)]!;
            return Task.FromResult<ReportSources?>(new ReportSources(
                ContractJson.Deserialize<SearchOverview>(s["search"]!.ToJsonString()), ContractJson.Deserialize<YoutubeOverview>(s["youtube"]!.ToJsonString()),
                ContractJson.Deserialize<List<ReportVideo>>(s["videos"]!.ToJsonString())));
        };
    }

    private static StatsKitOptions Options(string scenario) => scenario switch
    {
        "sources-en" => With(Full("en"), o => o.Report.Texts = _ => Task.FromResult<IReadOnlyDictionary<string, string>?>(new Dictionary<string, string> { ["report.footer"] = "Footer read at every report" })),
        "not-configured" => new StatsKitOptions { SiteName = "Empty site", WorldMap = false },
        "umami-error" => With(Full("fr"), o => o.Report = new ReportOptions { Send = (_, _) => throw new InvalidOperationException("mailbox full") }),
        "umami-login-refused" => new StatsKitOptions { SiteName = "Refused", Umami = Umami(), TimeZone = "UTC" },
        "regional-fr-CH" => Full("fr-CH"),
        "no-glance" => With(Full("en"), o => { o.Report.Glance = false; o.Report.Blocks = (_, _) => throw new InvalidOperationException("no blocks"); }),
        _ => Full(scenario["full-".Length..]),
    };

    private static StatsKitOptions With(StatsKitOptions o, Action<StatsKitOptions> change)
    {
        change(o);
        return o;
    }

    public static TheoryData<string> Scenarios() =>
        [.. Directory.GetFiles(Golden.Dir, "*.json").Select(f => Path.GetFileNameWithoutExtension(f)).Where(n => n is not ("formats" or "schedule")).Order()];

    [Theory]
    [MemberData(nameof(Scenarios))]
    public async Task Same_answers_as_the_Node_server(string scenario)
    {
        var golden = Golden.Load(scenario);
        var replay = new Replay((JsonObject)golden["calls"]!);
        var options = Options(scenario);
        WithSources(options, golden);
        options.Clock = new FixedClock(Now);
        var kit = new StatsKitServer(options, new HttpClient(replay));

        foreach (var answer in ((JsonArray)golden["answers"]!).Cast<JsonObject>())
        {
            var req = (JsonObject)answer["request"]!;
            var query = ((JsonObject)req["query"]!).ToDictionary(p => p.Key, p => (string)p.Value!);
            var label = $"{scenario}: {req["method"]} {req["path"]} {req["query"]!.ToJsonString()}";
            var r = await kit.HandleAsync(new KitRequest((string)req["method"]!, (string)req["path"]!, query), TestContext.Current.CancellationToken);

            Assert.True((int)answer["status"]! == r.Status, $"{label}: status {r.Status}, expected {answer["status"]} ({r.Body[..Math.Min(300, r.Body.Length)]})");
            var headers = new JsonObject(r.Headers.Select(h => KeyValuePair.Create(h.Key, (JsonNode?)h.Value)));
            if (Golden.Diff(answer["headers"], headers, label + " headers") is { } hdiff) Assert.Fail(hdiff);

            JsonNode? body;
            if ((string)req["path"]! == "/world.json" && r.Status == 200) body = "sha256:" + Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(r.Body)));
            else
            {
                body = JsonNode.Parse(r.Body);
                if (body is JsonObject o && o["html"] is JsonValue html) o["html"] = Golden.NormalizeImages((string)html!);
            }
            if (Golden.Diff(answer["body"], body, label) is { } diff) Assert.Fail(diff);
        }

        Assert.Empty(replay.Unexpected);
        Assert.Equal(((JsonObject)golden["calls"]!).Select(c => c.Key).Order(StringComparer.Ordinal), replay.Seen.Distinct().Order(StringComparer.Ordinal));
    }
}

/// <summary>Weekly schedule: the same week due as the Node server, every 30 minutes over three weeks (Golden/schedule.json).</summary>
public class ScheduleContractTests
{
    [Fact]
    public void Same_week_due_as_the_Node_server()
    {
        foreach (var c in ((JsonArray)Golden.Load("schedule")["due"]!).Cast<JsonObject>())
        {
            var s = (JsonObject)c["schedule"]!;
            var schedule = new WeeklySchedule { Weekday = (int)s["weekday"]!, Hour = (int)s["hour"]!, TimeZone = (string)s["timeZone"]! };
            if (s["catchUpDays"] is { } days) schedule.CatchUpDays = (int)days;
            var last = (string?)c["lastSent"];
            var from = Js.ParseInstant((string)c["from"]!);
            var due = (JsonArray)c["due"]!;
            for (var i = 0; i < due.Count; i++)
            {
                var t = from + i * (double)c["stepMinutes"]! * 60_000;
                Assert.True((string?)due[i] == schedule.Due(t, last), $"{s.ToJsonString()} last {last} at {Js.Iso(t)}: expected {due[i]}, got {schedule.Due(t, last)}");
            }
        }
    }
}
