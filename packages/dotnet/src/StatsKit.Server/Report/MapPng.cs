using System.IO.Compression;
using System.Text.Json;

namespace StatsKit.Report;

/// <summary>Colours of the PNG map (8-bit RGB).</summary>
public readonly record struct MapColors(byte[] Background, byte[] Land, byte[] Border, byte[] Low, byte[] High);

/// <summary>
/// World map as a PNG for the e-mail report. Mail clients (Outlook above all) show neither SVG nor JavaScript: the map is drawn
/// here, without dependency, with the same projection and the same drawing as the Node server (same pixels).
/// </summary>
public static class MapPng
{
    private const int Supersample = 2;
    internal const double LatMax = 84;
    internal const double LatMin = -58;

    private sealed record Feature(string Iso2, List<List<List<double[]>>> Polygons);

    private static readonly Lazy<List<Feature>> World = new(() => ParseWorld(WorldJson));
    private static readonly Lazy<Dictionary<string, double[]>> Centroids = new(() =>
        JsonSerializer.Deserialize<Dictionary<string, double[]>>(Texts.Resource("StatsKit.centroids.json"))!);

    /// <summary>Base map shipped with the library (Natural Earth 1:110m, public domain), as served on <c>/world.json</c>.</summary>
    public static string WorldJson => _worldJson ??= Texts.Resource("StatsKit.world-110m.json");
    private static string? _worldJson;

    private static List<Feature> ParseWorld(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var list = new List<Feature>();
        static List<double[]> Ring(JsonElement r) => [.. r.EnumerateArray().Select(p => new[] { p[0].GetDouble(), p[1].GetDouble() })];
        static List<List<double[]>> Rings(JsonElement p) => [.. p.EnumerateArray().Select(Ring)];
        foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            var iso2 = f.GetProperty("properties").TryGetProperty("iso2", out var i) ? i.GetString() ?? "" : "";
            var g = f.GetProperty("geometry");
            var coords = g.GetProperty("coordinates");
            var polygons = g.GetProperty("type").GetString() == "MultiPolygon" ? [.. coords.EnumerateArray().Select(Rings)] : new List<List<List<double[]>>> { Rings(coords) };
            list.Add(new Feature(iso2, polygons));
        }
        return list;
    }

    private static byte[] Mix(byte[] a, byte[] b, double t) => [.. Enumerable.Range(0, 3).Select(i => (byte)Js.Round(a[i] + (b[i] - a[i]) * t))];

    /// <summary>Intensity (0 to 1) of a country from its number of visits (square root: small numbers stay visible).</summary>
    internal static double Intensity(double n, double max) => n <= 0 ? 0 : max > 1 ? 0.15 + 0.85 * Math.Sqrt((n - 1) / (max - 1)) : 1;

    /// <summary>Fills a polygon (outer ring and holes) by scanline, even-odd rule.</summary>
    private static void Fill(List<List<(double X, double Y)>> rings, Action<int, int> paint, int height)
    {
        var edges = new List<(double X1, double Y1, double X2, double Y2)>();
        foreach (var pts in rings)
            for (var i = 0; i < pts.Count; i++)
            {
                var (x1, y1) = pts[i];
                var (x2, y2) = pts[(i + 1) % pts.Count];
                if (y1 != y2) edges.Add(y1 < y2 ? (x1, y1, x2, y2) : (x2, y2, x1, y1));
            }
        if (edges.Count == 0) return;
        var top = (int)Math.Max(0, Math.Floor(edges.Min(e => e.Y1)));
        var bottom = (int)Math.Min(height - 1, Math.Ceiling(edges.Max(e => e.Y2)));
        var xs = new List<double>();
        for (var y = top; y <= bottom; y++)
        {
            var cy = y + 0.5;
            xs.Clear();
            foreach (var e in edges) if (e.Y1 <= cy && cy < e.Y2) xs.Add(e.X1 + (cy - e.Y1) / (e.Y2 - e.Y1) * (e.X2 - e.X1));
            xs.Sort();
            for (var i = 0; i + 1 < xs.Count; i += 2)
                for (var x = (int)Js.Round(xs[i]); x < Js.Round(xs[i + 1]); x++) paint(x, y);
        }
    }

    /// <summary>Line segment (Bresenham).</summary>
    private static void Line(double x1, double y1, double x2, double y2, Action<int, int> paint)
    {
        int x = (int)Js.Round(x1), y = (int)Js.Round(y1);
        int ex = (int)Js.Round(x2), ey = (int)Js.Round(y2);
        int dx = Math.Abs(ex - x), dy = -Math.Abs(ey - y);
        int sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
        var err = dx + dy;
        while (true)
        {
            paint(x, y);
            if (x == ex && y == ey) return;
            var e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
        }
    }

    private static readonly uint[] CrcTable = [.. Enumerable.Range(0, 256).Select(n =>
    {
        var c = (uint)n;
        for (var k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
        return c;
    })];

    private static uint Crc32(ReadOnlySpan<byte> data)
    {
        var c = 0xFFFFFFFFu;
        foreach (var b in data) c = CrcTable[(c ^ b) & 0xFF] ^ (c >> 8);
        return c ^ 0xFFFFFFFFu;
    }

    /// <summary>RGB pixels (8 bits) → PNG.</summary>
    public static byte[] EncodePng(byte[] rgb, int width, int height)
    {
        var raw = new byte[(width * 3 + 1) * height];
        for (var y = 0; y < height; y++) Buffer.BlockCopy(rgb, y * width * 3, raw, y * (width * 3 + 1) + 1, width * 3);
        using var zipped = new MemoryStream();
        using (var z = new ZLibStream(zipped, CompressionLevel.Optimal, true)) z.Write(raw);
        using var png = new MemoryStream();
        png.Write([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        void Chunk(string type, byte[] data)
        {
            var head = new byte[8];
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(head, (uint)data.Length);
            System.Text.Encoding.ASCII.GetBytes(type, 0, 4, head, 4);
            var crcInput = new byte[4 + data.Length];
            Buffer.BlockCopy(head, 4, crcInput, 0, 4);
            Buffer.BlockCopy(data, 0, crcInput, 4, data.Length);
            var crc = new byte[4];
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(crc, Crc32(crcInput));
            png.Write(head);
            png.Write(data);
            png.Write(crc);
        }
        var ihdr = new byte[13];
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(ihdr, (uint)width);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(ihdr.AsSpan(4), (uint)height);
        ihdr[8] = 8; // 8 bits per channel
        ihdr[9] = 2; // RGB
        Chunk("IHDR", ihdr);
        Chunk("IDAT", zipped.ToArray());
        Chunk("IEND", []);
        return png.ToArray();
    }

    /// <summary>Draws the map: visited countries coloured by their visits, dots on small countries.</summary>
    public static (byte[] Png, int Width, int Height) Render(IEnumerable<(string Key, double Value)> countries, MapColors colors, int width = 1424)
    {
        var height = (int)Js.Round(width * (LatMax - LatMin) / 360);
        int w = width * Supersample, h = height * Supersample;
        var buf = new byte[w * h * 3];
        for (var i = 0; i < w * h; i++) Buffer.BlockCopy(colors.Background, 0, buf, i * 3, 3);
        Action<int, int> PaintWith(byte[] c) => (x, y) => { if (x >= 0 && x < w && y >= 0 && y < h) Buffer.BlockCopy(c, 0, buf, (y * w + x) * 3, 3); };
        (double, double) Px(double lon, double lat) => ((lon + 180) / 360 * w, (LatMax - lat) / (LatMax - LatMin) * h);
        var counts = new OrderedDictionary<string, double>();
        foreach (var (key, value) in countries) counts[key.ToUpperInvariant()] = (counts.TryGetValue(key.ToUpperInvariant(), out var v) ? v : 0) + value;
        var max = Math.Max(1, counts.Values.DefaultIfEmpty(0).Max());
        var outlines = new List<List<(double X, double Y)>>();

        foreach (var f in World.Value)
        {
            var n = counts.TryGetValue(f.Iso2, out var c) ? c : 0;
            var color = n != 0 ? Mix(colors.Low, colors.High, Intensity(n, max)) : colors.Land;
            foreach (var rings in f.Polygons)
            {
                var projected = rings.Select(ring => ring.Select(p => Px(p[0], p[1])).ToList()).ToList();
                Fill(projected, PaintWith(color), h);
                outlines.AddRange(projected);
            }
        }
        var trace = PaintWith(colors.Border);
        foreach (var ring in outlines) for (var i = 0; i + 1 < ring.Count; i++) Line(ring[i].X, ring[i].Y, ring[i + 1].X, ring[i + 1].Y, trace);

        // dots: a small country would otherwise vanish on a world map
        var white = new byte[] { 255, 255, 255 };
        foreach (var (code, n) in counts)
        {
            if (!Centroids.Value.TryGetValue(code, out var centroid) || n == 0) continue;
            var (cx, cy) = Px(centroid[1], centroid[0]);
            var r = (4 + 8 * (n / max)) * Supersample;
            for (var y = (int)Math.Floor(cy - r - 2); y <= Math.Ceiling(cy + r + 2); y++)
                for (var x = (int)Math.Floor(cx - r - 2); x <= Math.Ceiling(cx + r + 2); x++)
                {
                    var d = Js.Hypot(x + 0.5 - cx, y + 0.5 - cy);
                    if (d <= r + Supersample) PaintWith(d <= r ? colors.High : white)(x, y);
                }
        }

        // downscaling by block average (smoothed edges)
        var output = new byte[width * height * 3];
        for (var y = 0; y < height; y++)
            for (var x = 0; x < width; x++)
                for (var ch = 0; ch < 3; ch++)
                {
                    var sum = 0;
                    for (var dy = 0; dy < Supersample; dy++)
                        for (var dx = 0; dx < Supersample; dx++) sum += buf[((y * Supersample + dy) * w + x * Supersample + dx) * 3 + ch];
                    output[(y * width + x) * 3 + ch] = (byte)Js.Round(sum / (double)(Supersample * Supersample));
                }
        return (EncodePng(output, width, height), width, height);
    }
}
