using System.Globalization;

namespace StatsKit;

/// <summary>
/// The few JavaScript semantics the Node server relies on, reproduced exactly so that both servers give the same results:
/// rounding, conversion of a text to a number, writing of a number, Math.hypot, ISO dates.
/// </summary>
internal static class Js
{
    /// <summary><c>Math.round</c>: halves go up (towards +∞), unlike <see cref="Math.Round(double)"/>.</summary>
    public static double Round(double x)
    {
        if (double.IsNaN(x) || double.IsInfinity(x)) return x;
        var f = Math.Floor(x);
        return x - f >= 0.5 ? f + 1 : f;
    }

    /// <summary><c>Number(text)</c>: trimmed, empty is 0, decimal, exponent, hexadecimal; NaN otherwise.</summary>
    public static double Number(string? text)
    {
        if (text is null) return double.NaN;
        var s = text.Trim();
        if (s.Length == 0) return 0;
        if (s.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
            return long.TryParse(s[2..], NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out var h) ? h : double.NaN;
        if (s is "Infinity" or "+Infinity") return double.PositiveInfinity;
        if (s == "-Infinity") return double.NegativeInfinity;
        foreach (var c in s) if (!(char.IsAsciiDigit(c) || c is '.' or 'e' or 'E' or '+' or '-')) return double.NaN;
        return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : double.NaN;
    }

    /// <summary><c>String(number)</c> for the values the library writes (integers, decimals).</summary>
    public static string Str(double v)
    {
        if (double.IsNaN(v)) return "NaN";
        if (double.IsPositiveInfinity(v)) return "Infinity";
        if (double.IsNegativeInfinity(v)) return "-Infinity";
        if (v == 0) return "0";
        if (v == Math.Floor(v) && Math.Abs(v) < 1e21) return v.ToString("F0", CultureInfo.InvariantCulture);
        return v.ToString("R", CultureInfo.InvariantCulture);
    }

    /// <summary><c>Math.hypot</c> as V8 computes it (scaled, Kahan summation): same last bit.</summary>
    public static double Hypot(double a, double b)
    {
        a = Math.Abs(a);
        b = Math.Abs(b);
        var max = Math.Max(a, b);
        if (double.IsInfinity(max)) return double.PositiveInfinity;
        if (double.IsNaN(a) || double.IsNaN(b)) return double.NaN;
        if (max == 0) return 0;
        double sum = 0, compensation = 0;
        foreach (var value in new[] { a, b })
        {
            var n = value / max;
            var summand = n * n - compensation;
            var preliminary = sum + summand;
            compensation = preliminary - sum - summand;
            sum = preliminary;
        }
        return Math.Sqrt(sum) * max;
    }

    /// <summary><c>new Date(ms).toISOString()</c>: "2026-11-16T10:30:00.000Z".</summary>
    public static string Iso(double ms) =>
        DateTimeOffset.FromUnixTimeMilliseconds((long)Math.Floor(ms)).UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    /// <summary><c>Date.parse</c> of an ISO instant; NaN if it cannot be read.</summary>
    public static double ParseInstant(string? s)
    {
        if (string.IsNullOrEmpty(s)) return double.NaN;
        return DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var d)
            ? d.ToUnixTimeMilliseconds() : double.NaN;
    }

    /// <summary><c>Date.UTC(y, m - 1, d, h)</c>, overflowing values carried over as JavaScript does.</summary>
    public static double Utc(int y, int m, int d, int h = 0, int mi = 0, int s = 0) =>
        (new DateTime(y, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(m - 1).AddDays(d - 1).AddHours(h).AddMinutes(mi).AddSeconds(s) - DateTime.UnixEpoch).TotalMilliseconds;

    /// <summary>Decimal value of a double as Intl rounds it: its shortest representation ("1.005", not 1.00499…).</summary>
    public static decimal Exact(double v)
    {
        if (Math.Abs(v) >= 1e20) return (decimal)v;
        return decimal.Parse(v.ToString("R", CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture);
    }
}
