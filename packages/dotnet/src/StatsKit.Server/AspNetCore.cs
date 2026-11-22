using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace StatsKit;

/// <summary>ASP.NET Core integration: services and routes.</summary>
public static class StatsKitAspNetCore
{
    /// <summary>
    /// Registers a <see cref="StatsKitServer"/> (singleton) configured by <paramref name="configure"/>; calls to Umami go through a
    /// named <see cref="HttpClient"/> ("stats-kit").
    /// </summary>
    public static IServiceCollection AddStatsKit(this IServiceCollection services, Action<IServiceProvider, StatsKitOptions> configure)
    {
        services.AddHttpClient("stats-kit");
        services.AddSingleton(sp =>
        {
            var options = new StatsKitOptions();
            configure(sp, options);
            return new StatsKitServer(options, sp.GetRequiredService<IHttpClientFactory>().CreateClient("stats-kit"), sp.GetService<ILoggerFactory>()?.CreateLogger("StatsKit"));
        });
        return services;
    }

    /// <summary>
    /// Maps the routes under <paramref name="prefix"/> (avoid "analytics", "stats" or "track", which ad blockers block):
    /// <c>app.MapStatsKit("/api/admin/audience").RequireAuthorization("admin")</c>. The routes expose audience data: protect them.
    /// </summary>
    public static RouteGroupBuilder MapStatsKit(this IEndpointRouteBuilder app, string prefix, StatsKitServer? kit = null)
    {
        var group = app.MapGroup(prefix);
        async Task Handle(HttpContext context, string? path)
        {
            var server = kit ?? context.RequestServices.GetRequiredService<StatsKitServer>();
            var query = context.Request.Query.ToDictionary(q => q.Key, q => q.Value.ToString());
            var r = await server.HandleAsync(new KitRequest(context.Request.Method, "/" + (path ?? ""), query), context.RequestAborted).ConfigureAwait(false);
            context.Response.StatusCode = r.Status;
            foreach (var (k, v) in r.Headers)
            {
                if (k.Equals("Content-Type", StringComparison.OrdinalIgnoreCase)) context.Response.ContentType = v;
                else context.Response.Headers[k] = v;
            }
            await context.Response.WriteAsync(r.Body, context.RequestAborted).ConfigureAwait(false);
        }
        group.MapMethods("/", ["GET", "POST"], (HttpContext c) => Handle(c, null));
        group.MapMethods("/{**path}", ["GET", "POST"], (HttpContext c, string? path) => Handle(c, path));
        return group;
    }
}

/// <summary>Weekly report: one sending per ISO week, from the chosen day and hour.</summary>
public sealed class WeeklySchedule
{
    /// <summary>Weekday, 1 = Monday … 7 = Sunday.</summary>
    public int Weekday { get; set; } = 1;
    /// <summary>Hour from which to send (0 to 23).</summary>
    public int Hour { get; set; } = 8;
    /// <summary>IANA time zone.</summary>
    public string TimeZone { get; set; } = "UTC";
    /// <summary>
    /// Number of days, from the scheduled weekday, during which a missed report is still sent (3 by default: Monday, Tuesday and
    /// Wednesday for a Monday report). Later in the week nothing is sent until the next scheduled day, so a fresh install or a
    /// server started on a Sunday does not send a report out of time. 7 restores the former behaviour (catch up any day).
    /// </summary>
    public int CatchUpDays { get; set; } = 3;

    /// <summary>Week to send now ("2026-W47"), or null if it is not the time or if it has already been sent.</summary>
    public string? Due(double nowMs, string? lastSent)
    {
        var p = Time.ZonedParts(nowMs, TimeZone);
        var day = (int)new DateTime(p.Y, p.M, p.D).DayOfWeek;
        if (day == 0) day = 7;
        if (day < Weekday || day == Weekday && p.H < Hour) return null;
        if (day - Weekday >= Math.Max(1, CatchUpDays)) return null;
        var id = Time.WeekId(nowMs, TimeZone);
        return lastSent == id ? null : id;
    }
}

/// <summary>
/// Hosted service sending the weekly report: checks every 10 minutes, sends once a week (the last week sent is stored by the
/// site, so that several instances or a restart send it only once), tries again one hour later after a failure.
/// </summary>
public sealed class WeeklyReportService(
    WeeklySchedule schedule, Func<CancellationToken, Task<string?>> getLastSent, Func<string, CancellationToken, Task> setLastSent,
    Func<CancellationToken, Task<bool>> send, TimeProvider? clock = null, ILogger? logger = null) : BackgroundService
{
    private double _lastAttempt = double.NegativeInfinity;

    /// <summary>Check interval (10 minutes by default).</summary>
    public TimeSpan Interval { get; init; } = TimeSpan.FromMinutes(10);

    /// <summary>One pass: sends if it is time. Returns "sent", "skipped" or "failed".</summary>
    public async Task<string> TickAsync(CancellationToken ct = default)
    {
        var now = (double)(clock ?? TimeProvider.System).GetUtcNow().ToUnixTimeMilliseconds();
        var week = schedule.Due(now, await getLastSent(ct).ConfigureAwait(false));
        if (week is null || now - _lastAttempt < 3_600_000) return "skipped";
        _lastAttempt = now;
        var ok = false;
        try
        {
            ok = await send(ct).ConfigureAwait(false);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger?.LogError("[stats-kit] report {Week}: {Error}", week, e.Message);
        }
        if (!ok) return "failed";
        await setLastSent(week, ct).ConfigureAwait(false);
        logger?.LogInformation("[stats-kit] report {Week} sent", week);
        return "sent";
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken).ConfigureAwait(false);
            using var timer = new PeriodicTimer(Interval);
            do
            {
                try { await TickAsync(stoppingToken).ConfigureAwait(false); }
                catch (Exception e) when (!stoppingToken.IsCancellationRequested) { logger?.LogError(e, "[stats-kit] weekly report"); }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }
}
