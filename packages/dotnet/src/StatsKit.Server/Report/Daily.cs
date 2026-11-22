using System.Globalization;

namespace StatsKit.Report;

/// <summary>Visits and bounces of the report day by day, aligned on <c>overview.Series.Slots</c>.</summary>
public sealed record ReportDaily(IReadOnlyList<double> Visits, IReadOnlyList<double> Bounces);

/// <summary>
/// Figures of the report day by day that the overview does not carry: visits and bounces (one Umami <c>stats</c> call per day of
/// the period, for periods of 2 to 31 days counted by day) and the occurrences of each goal. They draw the small charts of the
/// "Visits", "Bounce" and goal figures. Same calls and same figures as the Node server.
/// </summary>
public static class Daily
{
    private static KeyValuePair<string, string> P(string k, double v) => new(k, Js.Str(v));

    /// <summary>Visits and bounces of each day of the period; null if the period is not counted by day, too long, or if Umami refuses one day.</summary>
    public static async Task<ReportDaily?> VisitsAsync(UmamiClient umami, StatsOverview o, CancellationToken ct = default)
    {
        var s = o.Series;
        if (o.Status != "ok" || s.Unit != "day" || s.Slots.Count < 2 || s.Slots.Count > 31) return null;
        var tz = o.Range.TimeZone;
        double from = Js.ParseInstant(o.Range.From), to = Js.ParseInstant(o.Range.To);
        static int N(string d, int at, int length) => int.Parse(d.AsSpan(at, length), NumberStyles.None, CultureInfo.InvariantCulture);
        var starts = s.Slots.Select(d => Time.ZonedToInstant(N(d, 0, 4), N(d, 5, 2), N(d, 8, 2), 0, tz)).ToList();
        async Task<Totals?> Day(int i)
        {
            try
            {
                var json = await umami.GetAsync("stats", [P("startAt", Math.Max(from, starts[i])), P("endAt", i + 1 < starts.Count ? starts[i + 1] : to)], ct).ConfigureAwait(false);
                return UmamiClient.ParseStats(json);
            }
            catch (Exception) when (!ct.IsCancellationRequested)
            {
                return null;
            }
        }
        var days = await Task.WhenAll(Enumerable.Range(0, starts.Count).Select(Day)).ConfigureAwait(false);
        if (days.Any(d => d is null)) return null;
        return new ReportDaily([.. days.Select(d => d!.Visits)], [.. days.Select(d => d!.Bounces)]);
    }

    /// <summary>Occurrences of each goal per slot (sum of its events), from <c>overview.EventSeries</c>; a goal without data is left out.</summary>
    public static Dictionary<string, IReadOnlyList<double>> GoalSeries(StatsOverview o, IEnumerable<GoalOptions> goals)
    {
        var output = new Dictionary<string, IReadOnlyList<double>>();
        if (o.EventSeries is not { } ev) return output;
        foreach (var g in goals)
        {
            var lines = g.Events.Where(ev.ContainsKey).Select(e => ev[e]).ToList();
            if (lines.Count > 0) output[g.Id] = [.. o.Series.Slots.Select((_, i) => lines.Sum(l => i < l.Count ? l[i] : 0))];
        }
        return output;
    }
}
