using System.Reflection;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace StatsKit;

/// <summary>
/// Texts of the library in one language (the same files as the Node server and the Angular components: en, fr, de, es, it, pt,
/// nl, ru, zh, ja, ko), completed by the site's overrides. A text is read by its path: <c>texts["report.title"]</c>.
/// </summary>
public sealed partial class Texts
{
    private readonly JsonObject _root;

    private Texts(JsonObject root) => _root = root;

    /// <summary>Codes of the languages shipped with the library.</summary>
    public static IReadOnlyList<string> Languages => [.. Shipped.Select(p => p.Key)];

    /// <summary>BCP 47 tag used for numbers and dates ("en-GB", or the regional tag asked: "fr-CH").</summary>
    public string Locale => (string)_root["locale"]!;

    /// <summary>All the texts, as JSON (same shape as <c>LOCALES.en</c> in <c>stats-kit/contract</c>).</summary>
    public JsonObject Json => (JsonObject)_root.DeepClone();

    /// <summary>Text at a path ("report.title"); the path itself if it does not exist.</summary>
    public string this[string path]
    {
        get
        {
            JsonNode? node = _root;
            foreach (var part in path.Split('.')) node = node is JsonObject o ? o[part] : null;
            return node is JsonValue v && v.TryGetValue<string>(out var s) ? s : path;
        }
    }

    /// <summary>Text of a dictionary of the texts ("devices", "channels"); null if absent.</summary>
    internal string? Entry(string group, string key) =>
        _root[group] is JsonObject o && o[key] is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;

    private static JsonObject? _shipped;
    private static JsonObject Shipped => _shipped ??= (JsonObject)JsonNode.Parse(Resource("StatsKit.locales.json"))!;

    internal static string Resource(string name)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name) ?? throw new InvalidOperationException($"Missing resource {name}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    /// <summary>Canonical BCP 47 tag ("FR-ch" → "fr-CH"), or null if the tag is not valid.</summary>
    internal static string? Canonical(string? tag)
    {
        if (string.IsNullOrEmpty(tag) || !TagPattern().IsMatch(tag)) return null;
        var parts = tag.Split('-');
        var output = new List<string> { parts[0].ToLowerInvariant() };
        for (var i = 1; i < parts.Length; i++)
        {
            var p = parts[i];
            if (i == 1 && p.Length == 4 && p.All(char.IsAsciiLetter)) output.Add(char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant());
            else if (p.Length == 2 && p.All(char.IsAsciiLetter) || p.Length == 3 && p.All(char.IsAsciiDigit)) output.Add(p.ToUpperInvariant());
            else output.Add(p.ToLowerInvariant());
        }
        return string.Join('-', output);
    }

    [GeneratedRegex("^([a-zA-Z]{2,3}|[a-zA-Z]{5,8})(-[a-zA-Z]{4})?(-([a-zA-Z]{2}|[0-9]{3}))?(-[a-zA-Z0-9]{1,8})*$")]
    private static partial Regex TagPattern();

    /// <summary>Shipped language for a tag: exact code, then the language part ("fr-CH" → "fr"); null if none.</summary>
    public static string? MatchLocale(string? tag)
    {
        var t = Canonical(tag);
        if (t is null) return null;
        var lang = t.Split('-')[0];
        return Shipped.ContainsKey(t) ? t : Shipped.ContainsKey(lang) ? lang : null;
    }

    /// <summary>
    /// Texts of a language, completed by the site's overrides. A tag with a region ("fr-CH") uses that language's texts and keeps
    /// the tag for number and date formats. An unknown language falls back to English, or to the complete set given as
    /// <paramref name="baseTexts"/> (same shape as the English texts).
    /// </summary>
    /// <param name="locale">"en" (default), "fr", "de", "es", "it", "pt", "nl", "ru", "zh", "ja", "ko", or a regional tag.</param>
    /// <param name="overrides">Texts replaced by the site, by path: <c>{ ["report.footer"] = "Sent every Monday." }</c>.</param>
    /// <param name="baseTexts">Complete texts of a language the library does not ship.</param>
    public static Texts Create(string? locale = "en", IReadOnlyDictionary<string, string>? overrides = null, JsonObject? baseTexts = null)
    {
        locale ??= "en";
        var code = MatchLocale(locale);
        var start = (JsonObject)(baseTexts ?? Shipped[code ?? "en"]!).DeepClone();
        var tag = Canonical(locale);
        if (baseTexts is null && code is not null && tag is not null && tag != code && tag.Contains('-')) start["locale"] = tag;
        foreach (var (path, value) in overrides ?? new Dictionary<string, string>())
        {
            var parts = path.Split('.');
            var node = start;
            foreach (var part in parts[..^1])
            {
                if (node[part] is not JsonObject child) node[part] = child = new JsonObject();
                node = child;
            }
            node[parts[^1]] = value;
        }
        return new Texts(start);
    }

    /// <summary>Fills the "{name}" variables of a text; a missing variable is left as is.</summary>
    public static string Fill(string template, IReadOnlyDictionary<string, string>? vars = null) =>
        vars is null ? template : FillPattern().Replace(template, m => vars.TryGetValue(m.Groups[1].Value, out var v) ? v : m.Value);

    [GeneratedRegex(@"\{([A-Za-z0-9_]+)\}")]
    private static partial Regex FillPattern();
}
