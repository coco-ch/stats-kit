using System.IO.Compression;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using StatsKit;

namespace StatsKit.Tests;

/// <summary>Fixed clock.</summary>
public sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;
    public override DateTimeOffset GetUtcNow() => Now;
}

/// <summary>Answers Umami calls from a recording of the Node server (Golden/*.json, "calls"), and notes every call made.</summary>
public sealed class Replay(JsonObject calls) : HttpMessageHandler
{
    public List<string> Seen { get; } = [];
    public List<string> Unexpected { get; } = [];

    /// <summary>Key of a call, as the Node script writes it: method, address, parameters sorted and encoded like URLSearchParams.</summary>
    public static string Key(HttpMethod method, Uri uri)
    {
        var pairs = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries).Select(p =>
        {
            var i = p.IndexOf('=');
            string D(string s) => Uri.UnescapeDataString(s.Replace('+', ' '));
            return i < 0 ? (D(p), "") : (D(p[..i]), D(p[(i + 1)..]));
        }).OrderBy(p => p.Item1, StringComparer.Ordinal).ThenBy(p => p.Item2, StringComparer.Ordinal);
        var q = UmamiClient.Query(pairs.Select(p => new KeyValuePair<string, string>(p.Item1, p.Item2)));
        return $"{method.Method.ToUpperInvariant()} {uri.Scheme}://{uri.Authority}{uri.AbsolutePath}{(q.Length > 0 ? "?" + q : "")}";
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var key = Key(request.Method, request.RequestUri!);
        lock (Seen) Seen.Add(key);
        if (calls[key] is not JsonObject call)
        {
            lock (Unexpected) Unexpected.Add(key);
            return Task.FromResult(new HttpResponseMessage((HttpStatusCode)599) { Content = new StringContent("unexpected call") });
        }
        return Task.FromResult(new HttpResponseMessage((HttpStatusCode)(int)call["status"]!) { Content = new StringContent((string)call["body"]!, Encoding.UTF8, "application/json") });
    }
}

public static class Golden
{
    public static string Dir => Path.Combine(AppContext.BaseDirectory, "Golden");
    public static JsonObject Load(string name) => (JsonObject)JsonNode.Parse(File.ReadAllText(Path.Combine(Dir, name + ".json")))!;

    /// <summary>Hash of the raw pixels of a PNG written by the library (8-bit RGB or RGBA, filter 0), as the Node script computes it.</summary>
    public static string Pixels(byte[] png)
    {
        int U32(int at) => png[at] << 24 | png[at + 1] << 16 | png[at + 2] << 8 | png[at + 3];
        int width = U32(16), height = U32(20), bpp = png[25] == 6 ? 4 : 3;
        using var idat = new MemoryStream();
        for (var i = 8; i < png.Length;)
        {
            var len = U32(i);
            if (Encoding.ASCII.GetString(png, i + 4, 4) == "IDAT") idat.Write(png, i + 8, len);
            i += 12 + len;
        }
        idat.Position = 0;
        using var z = new ZLibStream(idat, CompressionMode.Decompress);
        using var raw = new MemoryStream();
        z.CopyTo(raw);
        var bytes = raw.ToArray();
        var rgb = new byte[width * height * bpp];
        for (var y = 0; y < height; y++) Buffer.BlockCopy(bytes, y * (width * bpp + 1) + 1, rgb, y * width * bpp, width * bpp);
        return $"{width}x{height}:{Convert.ToHexStringLower(SHA256.HashData(rgb))}";
    }

    public static string NormalizeImages(string html) =>
        Regex.Replace(html, "data:image/png;base64,([A-Za-z0-9+/=]+)", m => $"data:image/png;pixels,{Pixels(Convert.FromBase64String(m.Groups[1].Value))}");

    /// <summary>First difference between two JSON values (numbers compared as numbers), or null.</summary>
    public static string? Diff(JsonNode? expected, JsonNode? actual, string path = "$")
    {
        switch (expected)
        {
            case null: return actual is null ? null : $"{path}: expected null, got {actual.ToJsonString()[..Math.Min(80, actual.ToJsonString().Length)]}";
            case JsonObject eo:
                if (actual is not JsonObject ao) return $"{path}: expected an object";
                foreach (var (k, v) in eo) { if (!ao.ContainsKey(k)) return $"{path}.{k}: missing"; if (Diff(v, ao[k], $"{path}.{k}") is { } d) return d; }
                foreach (var (k, _) in ao) if (!eo.ContainsKey(k)) return $"{path}.{k}: unexpected";
                return null;
            case JsonArray ea:
                if (actual is not JsonArray aa) return $"{path}: expected an array";
                if (ea.Count != aa.Count) return $"{path}: {ea.Count} items expected, {aa.Count} found";
                for (var i = 0; i < ea.Count; i++) if (Diff(ea[i], aa[i], $"{path}[{i}]") is { } d) return d;
                return null;
            default:
                var e = (JsonValue)expected;
                if (actual is not JsonValue a) return $"{path}: expected a value";
                if (e.TryGetValue<double>(out var en)) return a.TryGetValue<double>(out var an) && an.Equals(en) ? null : $"{path}: expected {en}, got {a.ToJsonString()}";
                if (e.TryGetValue<bool>(out var eb)) return a.TryGetValue<bool>(out var ab) && ab == eb ? null : $"{path}: expected {eb}, got {a.ToJsonString()}";
                var es = e.GetValue<string>();
                var s = a.TryGetValue<string>(out var x) ? x : a.ToJsonString();
                if (es == s) return null;
                var at = 0;
                while (at < Math.Min(es.Length, s.Length) && es[at] == s[at]) at++;
                string Around(string t) => t.Substring(Math.Max(0, at - 60), Math.Min(140, t.Length - Math.Max(0, at - 60)));
                return $"{path}: strings differ at {at}\n  expected: …{Around(es)}…\n  actual:   …{Around(s)}…";
        }
    }
}
