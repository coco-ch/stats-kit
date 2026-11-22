namespace StatsKit.Report;

/// <summary>
/// Small charts of the key figures, as PNG images (RGBA, transparent background) for the e-mail report: mail clients show
/// neither SVG nor JavaScript. Plain arithmetic only, in the same order as the Node server: the same pixels.
/// </summary>
public static class SparkPng
{
    /// <summary>Width of the images, in pixels (shown at half size: sharp on high-density screens).</summary>
    public const int Width = 264;
    /// <summary>Height of the images, in pixels.</summary>
    public const int Height = 56;
    /// <summary>Samples per pixel along each axis (smoothed edges).</summary>
    private const int S = 3;

    /// <summary>Kind of a sample: 0 empty, 1 full colour, 2 light colour (area under the line), 3 second colour.</summary>
    private static byte[] Pixels(int width, int height, Func<double, double, int> sample, byte[][] colors, double[] weights)
    {
        var output = new byte[width * height * 4];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                int full = 0, light = 0, second = 0;
                for (var dy = 0; dy < S; dy++)
                {
                    for (var dx = 0; dx < S; dx++)
                    {
                        var s = sample(x * S + dx + 0.5, y * S + dy + 0.5);
                        if (s == 1) full++;
                        else if (s == 2) light++;
                        else if (s == 3) second++;
                    }
                }
                var i = (y * width + x) * 4;
                var c = second > full + light ? colors[1] : colors[0];
                output[i] = c[0];
                output[i + 1] = c[1];
                output[i + 2] = c[2];
                output[i + 3] = (byte)Js.Round((full * weights[0] + light * weights[1] + second * weights[2]) / (S * S) * 255);
            }
        }
        return MapPng.EncodePng(output, width, height, 4);
    }

    /// <summary>
    /// Trend of a series: line, light area below it, dot on the last value. Null with fewer than two values or nothing above zero.
    /// </summary>
    public static byte[]? Sparkline(IReadOnlyList<double> values, byte[] color, int width = Width, int height = Height)
    {
        var n = values.Count;
        if (n < 2 || !values.Any(v => v > 0)) return null;
        double w = width * S, h = height * S;
        double r = 3.5 * S, ht = 1.6 * S, pad = r + S;
        double lo = values[0], hi = values[0];
        foreach (var v in values)
        {
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        var xs = new double[n];
        var ys = new double[n];
        for (var i = 0; i < n; i++)
        {
            xs[i] = pad + i * (w - 2 * pad) / (n - 1);
            ys[i] = hi == lo ? h / 2 : pad + (hi - values[i]) * (h - 2 * pad) / (hi - lo);
        }
        double lx = xs[n - 1], ly = ys[n - 1];
        double r2 = r * r, ht2 = ht * ht;
        return Pixels(width, height, (px, py) =>
        {
            if ((px - lx) * (px - lx) + (py - ly) * (py - ly) <= r2) return 1;
            var curve = -1.0;
            for (var k = 0; k < n - 1; k++)
            {
                double x1 = xs[k], y1 = ys[k], x2 = xs[k + 1], y2 = ys[k + 1];
                if (px < x1 - ht || px > x2 + ht) continue;
                if (curve < 0 && px >= x1 && px <= x2) curve = y1 + (px - x1) * (y2 - y1) / (x2 - x1);
                double dx = x2 - x1, dy = y2 - y1;
                var t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
                if (t < 0) t = 0;
                if (t > 1) t = 1;
                double ex = x1 + t * dx - px, ey = y1 + t * dy - py;
                if (ex * ex + ey * ey <= ht2) return 1;
            }
            return curve >= 0 && py >= curve ? 2 : 0;
        }, [color, color], [1, 0.16, 1]);
    }

    /// <summary>
    /// This period against the previous one, for a figure without a series (visits, bounce rate, goals): two rounded bars, the
    /// previous period above in <paramref name="before"/>, this period below in <paramref name="now"/>. Null if both are zero.
    /// </summary>
    public static byte[]? Compare(double previous, double current, byte[] now, byte[] before, int width = Width, int height = Height)
    {
        if (!(previous > 0) && !(current > 0)) return null;
        double w = width * S;
        var max = previous > current ? previous : current;
        double r = 7 * S, top = 10 * S, gap = 8 * S;
        double x0 = S;
        double End(double v)
        {
            var x = x0 + (v > 0 ? v : 0) * (w - 2 * S) / max;
            return x < x0 + 2 * r ? x0 + 2 * r : x;
        }
        var bars = new (double Y, double X1, int Colour)[] { (top, End(previous), 3), (top + 2 * r + gap, End(current), 1) };
        return Pixels(width, height, (px, py) =>
        {
            foreach (var (y, x1, colour) in bars)
            {
                var cy = y + r;
                if (py < y || py > y + 2 * r) continue;
                if (px >= x0 + r && px <= x1 - r) return colour;
                var cx = px < x0 + r ? x0 + r : x1 - r;
                if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r) return colour;
            }
            return 0;
        }, [now, before], [1, 0, 1]);
    }
}
