using System.Net;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using StatsKit;

namespace StatsKit.Tests;

/// <summary>Answers with a function.</summary>
public sealed class Fake(Func<HttpRequestMessage, HttpResponseMessage> answer) : HttpMessageHandler
{
    public List<string> Urls { get; } = [];
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        lock (Urls) Urls.Add($"{request.Method} {request.RequestUri}");
        return Task.FromResult(answer(request));
    }
}

public class UnitTests
{
    private static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) => new(status) { Content = new StringContent(body) };
    private static readonly UmamiOptions Account = new() { Url = "https://u.example.test/", WebsiteId = "w", Username = "reader", Password = "secret" };
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Umami_signs_in_once_and_again_after_a_401()
    {
        var expired = true;
        var fake = new Fake(r =>
        {
            if (r.RequestUri!.AbsolutePath.EndsWith("/auth/login")) return Json("{\"token\":\"t\"}");
            if (r.RequestUri.AbsolutePath.EndsWith("/active") && expired) { expired = false; return Json("{}", HttpStatusCode.Unauthorized); }
            return Json("{\"visitors\":3}");
        });
        var u = new UmamiClient(Account, new HttpClient(fake));
        await Task.WhenAll(u.GetAsync("stats", null, Ct), u.GetAsync("stats", null, Ct));
        Assert.Single(fake.Urls, x => x.EndsWith("/auth/login"));
        Assert.Equal(3, (double)(await u.GetAsync("active", null, Ct))!["visitors"]!);
        Assert.Equal(2, fake.Urls.Count(x => x.EndsWith("/auth/login")));
        Assert.Contains("GET https://u.example.test/api/websites/w/stats", fake.Urls);
    }

    [Fact]
    public async Task Umami_refused_account_and_api_key()
    {
        var refused = new UmamiClient(Account, new HttpClient(new Fake(_ => Json("", HttpStatusCode.Unauthorized))));
        var e = await Assert.ThrowsAsync<SourceException>(() => refused.GetAsync("stats", null, Ct));
        Assert.Equal("umami login 401", e.Message);

        var fake = new Fake(r => Json(r.Headers.GetValues("x-umami-api-key").Single() == "key" ? "{\"visitors\":1}" : "{}"));
        var cloud = new UmamiClient(new UmamiOptions { Url = "https://api.umami.example.test/v1/", WebsiteId = "w", ApiKey = "key" }, new HttpClient(fake));
        Assert.Equal(1, (double)(await cloud.GetAsync("active", null, Ct))!["visitors"]!);
        Assert.Equal(["GET https://api.umami.example.test/v1/websites/w/active"], fake.Urls);
    }

    [Fact]
    public async Task Path_becomes_url_on_Umami_2_once_and_for_all()
    {
        var types = new List<string>();
        var fake = new Fake(r =>
        {
            if (r.RequestUri!.AbsolutePath.EndsWith("/auth/login")) return Json("{\"token\":\"t\"}");
            var type = System.Web.HttpUtility.ParseQueryString(r.RequestUri.Query)["type"] ?? "";
            types.Add(type);
            return type == "path" ? Json("bad", HttpStatusCode.BadRequest) : Json("[{\"x\":\"/\",\"y\":1}]");
        });
        var u = new UmamiClient(Account, new HttpClient(fake));
        Assert.Single(await u.MetricAsync("path", 0, 1, ct: Ct));
        await u.MetricAsync("path", 0, 1, ct: Ct);
        await u.MetricAsync("country", 0, 1, ct: Ct);
        Assert.Equal(["path", "url", "url", "country"], types);
    }

    [Fact]
    public void Configuration_and_default_account()
    {
        var values = new Dictionary<string, string?> { ["UMAMI_API_URL"] = "https://u", ["UMAMI_WEBSITE_ID"] = "w", ["UMAMI_USERNAME"] = "admin", ["UMAMI_PASSWORD"] = "umami", ["UMAMI_DASHBOARD_URL"] = "false" };
        var o = UmamiOptions.FromValues(k => values.GetValueOrDefault(k));
        Assert.NotNull(o);
        Assert.True(o.UsesDefaultAccount);
        Assert.True(o.HideDashboard);
        Assert.Null(UmamiOptions.FromValues(_ => null));
        Assert.Equal("https://u", UmamiOptions.FromValues(k => k switch { "Url" => "https://u", "WebsiteId" => "w", "ApiKey" => "k", _ => null })!.Url);
    }

    [Fact]
    public void Periods_and_daylight_saving_time()
    {
        var now = DateTimeOffset.Parse("2026-11-16T10:30:00Z").ToUnixTimeMilliseconds();
        var r = Time.ResolveRange(new RangeQuery(From: "2026-03-29", To: "2026-03-29"), "Europe/Paris", now);
        Assert.Equal("2026-03-28T23:00:00.000Z", r.From);
        Assert.Equal("2026-03-29T22:00:00.000Z", r.To);
        Assert.Equal("hour", r.Unit);
        Assert.Equal(23, Time.SlotsBetween(Js.ParseInstant(r.From), Js.ParseInstant(r.To), "hour", "Europe/Paris").Count);
        Assert.Equal(30, Time.ResolveRange(new RangeQuery("abc"), "UTC", now).Days);
        Assert.Equal(366, Time.ResolveRange(new RangeQuery("9999"), "UTC", now).Days);
        Assert.Equal("2026-11-16T11", Time.SlotOfLabel("2026-11-16T10:00:00Z", "hour", "Europe/Paris"));
        Assert.Equal("2026-11-16T14", Time.SlotOfLabel("2026-11-16 14:00:00", "hour", "Europe/Paris"));
        Assert.Equal("2026-W47", Time.WeekId(now, "Europe/Paris"));
    }

    [Fact]
    public async Task Weekly_report_once_per_week_and_again_after_a_failure()
    {
        var clock = new FixedClock(DateTimeOffset.Parse("2026-11-16T06:30:00Z")); // Monday 7:30 in Paris
        string? last = null;
        var results = new Queue<bool>([false, true]);
        var service = new WeeklyReportService(new WeeklySchedule { Weekday = 1, Hour = 8, TimeZone = "Europe/Paris" },
            _ => Task.FromResult(last), (w, _) => { last = w; return Task.CompletedTask; }, _ => Task.FromResult(results.Dequeue()), clock);
        Assert.Equal("skipped", await service.TickAsync(Ct));
        clock.Now = clock.Now.AddHours(1);
        Assert.Equal("failed", await service.TickAsync(Ct));
        clock.Now = clock.Now.AddMinutes(30);
        Assert.Equal("skipped", await service.TickAsync(Ct)); // one hour between two attempts
        clock.Now = clock.Now.AddMinutes(31);
        Assert.Equal("sent", await service.TickAsync(Ct));
        Assert.Equal("2026-W47", last);
        Assert.Equal("skipped", await service.TickAsync(Ct));
    }

    [Fact]
    public async Task Overview_cache_keeps_answers_but_not_errors()
    {
        var fail = true;
        var fake = new Fake(r =>
        {
            if (r.RequestUri!.AbsolutePath.EndsWith("/auth/login")) return Json("{\"token\":\"t\"}");
            if (r.RequestUri.AbsolutePath.EndsWith("/stats") && fail) return Json("down", HttpStatusCode.BadGateway);
            return Json(r.RequestUri.AbsolutePath.EndsWith("/stats") ? "{\"pageviews\":5,\"visitors\":{\"value\":2}}" : "[]");
        });
        var kit = new StatsKitServer(new StatsKitOptions { SiteName = "S", Umami = Account, Clock = new FixedClock(DateTimeOffset.Parse("2026-11-16T10:30:00Z")) }, new HttpClient(fake));
        var first = await kit.OverviewAsync(RangeQuery.ForDays(7), Ct);
        Assert.Equal("error", first.Status);
        Assert.Equal("umami stats 502 down", first.Error);
        fail = false;
        var second = await kit.OverviewAsync(RangeQuery.ForDays(7), Ct);
        Assert.Equal("ok", second.Status);
        Assert.Equal(2, second.Totals.Visitors);
        var calls = fake.Urls.Count;
        Assert.Same(second, await kit.OverviewAsync(RangeQuery.ForDays(7), Ct));
        Assert.Equal(calls, fake.Urls.Count);
    }

    [Fact]
    public async Task Routes_in_an_ASP_NET_Core_application()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddStatsKit((_, o) =>
        {
            o.SiteName = "Site";
            o.Report.Send = (m, _) => Task.FromResult(m.Attachments.Count == 0 ? 1 : 0);
        });
        await using var app = builder.Build();
        app.MapStatsKit("/api/admin/audience");
        await app.StartAsync(Ct);
        var client = app.GetTestClient();

        var overview = await client.GetAsync("/api/admin/audience/overview?days=7", Ct);
        Assert.Equal(HttpStatusCode.OK, overview.StatusCode);
        Assert.Equal("application/json; charset=utf-8", overview.Content.Headers.ContentType!.ToString());
        Assert.Equal("no-store", overview.Headers.CacheControl!.ToString());
        var json = JsonNode.Parse(await overview.Content.ReadAsStringAsync(Ct))!;
        Assert.Equal("not-configured", (string)json["status"]!);
        Assert.NotEmpty(json["series"]!["slots"]!.AsArray());

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/audience", Ct)).StatusCode);
        Assert.StartsWith("{\"type\":\"FeatureCollection\"", (await client.GetStringAsync("/api/admin/audience/world.json", Ct))[..40].Replace(" ", ""));
        var sent = await client.PostAsync("/api/admin/audience/report/send?days=7", null, Ct);
        Assert.Equal("{\"version\":1,\"ok\":true,\"recipients\":1,\"error\":null}", await sent.Content.ReadAsStringAsync(Ct));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/admin/audience/nothing", Ct)).StatusCode);
        var preview = JsonNode.Parse(await client.GetStringAsync("/api/admin/audience/report/preview", Ct))!;
        Assert.Contains("Visit statistics are not connected.", (string)preview["html"]!);
        await app.StopAsync(Ct);
    }
}
