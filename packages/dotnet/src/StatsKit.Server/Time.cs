using System.Globalization;
using System.Text.RegularExpressions;

namespace StatsKit;

/// <summary>Period asked in the address: <c>days</c>, or <c>from</c> and <c>to</c> ("YYYY-MM-DD"), as received (texts).</summary>
public sealed record RangeQuery(string? Days = null, string? From = null, string? To = null)
{
    /// <summary>The last <paramref name="days"/> days.</summary>
    public static RangeQuery ForDays(double days) => new(Js.Str(days));
}

/// <summary>Dates and time zones: periods, series slots, conversion of a wall-clock time into an instant.</summary>
public static partial class Time
{
    internal const double Hour = 3_600_000;
    internal const double Day = 86_400_000;

    private static readonly Dictionary<string, TimeZoneInfo> Zones = [];

    /// <summary>Time zone from its IANA id ("Europe/Paris"); UTC if unknown.</summary>
    public static TimeZoneInfo Zone(string id)
    {
        lock (Zones)
        {
            if (Zones.TryGetValue(id, out var z)) return z;
            try { z = TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException) { z = TimeZoneInfo.Utc; }
            return Zones[id] = z;
        }
    }

    internal readonly record struct Parts(int Y, int M, int D, int H, int Mi, int S);

    /// <summary>Wall-clock time of an instant in a time zone.</summary>
    internal static Parts ZonedParts(double ms, string timeZone)
    {
        var utc = DateTimeOffset.FromUnixTimeMilliseconds((long)Math.Floor(ms));
        var t = TimeZoneInfo.ConvertTime(utc, Zone(timeZone)).DateTime;
        return new Parts(t.Year, t.Month, t.Day, t.Hour, t.Minute, t.Second);
    }

    private static double OffsetAt(double ms, string timeZone)
    {
        var p = ZonedParts(ms, timeZone);
        return Js.Utc(p.Y, p.M, p.D, p.H, p.Mi, p.S) - Math.Floor(ms / 1000) * 1000;
    }

    /// <summary>Instant (ms) of a wall-clock time in a time zone, daylight saving time included.</summary>
    public static double ZonedToInstant(int y, int m, int d, int h, string timeZone)
    {
        var wall = Js.Utc(y, m, d, h);
        var first = wall - OffsetAt(wall, timeZone);
        return wall - OffsetAt(first, timeZone);
    }

    private static string Pad(int n) => n.ToString("00", CultureInfo.InvariantCulture);

    /// <summary>Slot of an instant: "YYYY-MM-DD" (day) or "YYYY-MM-DDTHH" (hour), in the time zone.</summary>
    public static string SlotOf(double ms, string unit, string timeZone)
    {
        var p = ZonedParts(ms, timeZone);
        var day = $"{p.Y:0000}-{Pad(p.M)}-{Pad(p.D)}";
        return unit == "day" ? day : $"{day}T{Pad(p.H)}";
    }

    /// <summary>All the slots of [from, to[, in order, without gaps.</summary>
    public static List<string> SlotsBetween(double from, double to, string unit, string timeZone)
    {
        var output = new List<string>();
        for (var t = Math.Floor(from / Hour) * Hour; t < to; t += Hour)
        {
            var key = SlotOf(t, unit, timeZone);
            if (output.Count == 0 || output[^1] != key) output.Add(key);
        }
        return output;
    }

    [GeneratedRegex(@"(Z|[+-]\d{2}:?\d{2})$")]
    private static partial Regex Offset();

    /// <summary>Slot of a date returned by a source: an instant is converted to the time zone; a wall-clock time is read as is.</summary>
    public static string SlotOfLabel(string x, string unit, string timeZone)
    {
        if (Offset().IsMatch(x))
        {
            var t = Js.ParseInstant(x);
            if (!double.IsNaN(t)) return SlotOf(t, unit, timeZone);
        }
        var day = x.Length >= 10 ? x[..10] : x;
        var hour = x.Length >= 13 ? x[11..13] : x.Length > 11 ? x[11..] : "";
        return unit == "day" ? day : $"{day}T{(hour.Length > 0 ? hour : "00")}";
    }

    [GeneratedRegex(@"^(\d{4})-(\d{2})-(\d{2})$")]
    private static partial Regex Ymd();

    /// <summary>
    /// Requested period: <c>days</c> (1 = last 24 hours, up to 366; 30 by default) or <c>from</c> / <c>to</c> (days included, read in
    /// the time zone, at most 366 days). The previous period has the same length and ends where the period starts.
    /// </summary>
    public static Range ResolveRange(RangeQuery q, string timeZone, double now, double defaultDays = 30)
    {
        double? from = null;
        var to = now;
        var f = q.From is null ? null : Ymd().Match(q.From);
        if (f is { Success: true })
        {
            var t = q.To is null ? null : Ymd().Match(q.To);
            int I(Match m, int g) => int.Parse(m.Groups[g].Value, CultureInfo.InvariantCulture);
            var start = ZonedToInstant(I(f, 1), I(f, 2), I(f, 3), 0, timeZone);
            double end = now;
            if (t is { Success: true })
            {
                var next = new DateTime(I(t, 1), 1, 1).AddMonths(I(t, 2) - 1).AddDays(I(t, 3));
                end = Math.Min(now, ZonedToInstant(next.Year, next.Month, next.Day, 0, timeZone));
            }
            if (end > start && end - start <= 366 * Day)
            {
                from = start;
                to = end;
            }
        }
        if (from is null)
        {
            var asked = Math.Floor(Js.Number(q.Days));
            var days = double.IsFinite(asked) && asked >= 1 ? Math.Min(asked, 366) : defaultDays;
            from = now - days * Day;
            to = now;
        }
        var length = to - from.Value;
        return new Range(Js.Iso(from.Value), Js.Iso(to), Math.Max(1, Js.Round(length / Day)), length <= Day ? "hour" : "day", timeZone,
            Js.Iso(from.Value - length), Js.Iso(from.Value));
    }

    /// <summary>ISO week id ("2026-W47") of an instant, computed on the date in the time zone.</summary>
    public static string WeekId(double ms, string timeZone)
    {
        var p = ZonedParts(ms, timeZone);
        var date = new DateTime(p.Y, p.M, p.D);
        return $"{ISOWeek.GetYear(date)}-W{Pad(ISOWeek.GetWeekOfYear(date))}";
    }
}
