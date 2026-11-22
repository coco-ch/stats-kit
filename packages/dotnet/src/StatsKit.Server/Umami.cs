using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace StatsKit;

/// <summary>Settings of the Umami connector (API v2 and v3, self-hosted or Umami Cloud).</summary>
public sealed class UmamiOptions
{
    /// <summary>Umami address ("https://umami.example.org"); for Umami Cloud: "https://api.umami.is/v1" with <see cref="ApiKey"/>.</summary>
    public string Url { get; set; } = "";
    /// <summary>Website id in Umami.</summary>
    public string WebsiteId { get; set; } = "";
    /// <summary>Service account (read-only) of a self-hosted Umami.</summary>
    public string? Username { get; set; }
    /// <summary>Password of the service account.</summary>
    public string? Password { get; set; }
    /// <summary>API key (Umami Cloud): replaces the service account.</summary>
    public string? ApiKey { get; set; }
    /// <summary>Dashboard opened by the "Open Umami" button (default: {Url}/websites/{WebsiteId}).</summary>
    public string? DashboardUrl { get; set; }
    /// <summary>Hides the "Open Umami" button.</summary>
    public bool HideDashboard { get; set; }
    /// <summary>Timeout of a call (15 s by default).</summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(15);

    /// <summary>True when the settings are complete.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Url) && !string.IsNullOrWhiteSpace(WebsiteId)
        && (!string.IsNullOrEmpty(ApiKey) || !string.IsNullOrEmpty(Username) && !string.IsNullOrEmpty(Password));

    /// <summary>True when the connector signs in with the account a new self-hosted Umami is installed with (admin / umami).</summary>
    public bool UsesDefaultAccount => string.IsNullOrEmpty(ApiKey) && Username == "admin" && Password == "umami";

    /// <summary>Settings read from configuration keys (<c>UMAMI_API_URL</c>… or a section with Url, WebsiteId…); null if incomplete.</summary>
    public static UmamiOptions? FromValues(Func<string, string?> get)
    {
        string? V(params string[] keys) => keys.Select(k => get(k)?.Trim()).FirstOrDefault(v => !string.IsNullOrEmpty(v));
        var o = new UmamiOptions
        {
            Url = V("UMAMI_API_URL", "Url", "ApiUrl") ?? "",
            WebsiteId = V("UMAMI_WEBSITE_ID", "WebsiteId") ?? "",
            Username = V("UMAMI_USERNAME", "Username"),
            Password = V("UMAMI_PASSWORD", "Password"),
            ApiKey = V("UMAMI_API_KEY", "ApiKey"),
        };
        var dash = V("UMAMI_DASHBOARD_URL", "DashboardUrl");
        if (dash == "false") o.HideDashboard = true;
        else o.DashboardUrl = dash;
        return o.IsConfigured ? o : null;
    }
}

/// <summary>Error of a source, with the HTTP status if there is one.</summary>
public sealed class SourceException(string message, int? status = null) : Exception(message)
{
    /// <summary>HTTP status of the answer, if any.</summary>
    public int? Status { get; } = status;
}

/// <summary>A point of an Umami ranking or series.</summary>
internal readonly record struct Point(string X, double Y);

/// <summary>
/// Umami connector, read-only. The service account signs in once; its token is shared by simultaneous calls and renewed on a 401.
/// </summary>
public sealed class UmamiClient
{
    private readonly HttpClient _http;
    private readonly string _api;
    private string? _token;
    private Task<string>? _signingIn;
    private readonly object _gate = new();
    private string _pathType = "path";

    /// <summary>Settings of the connector.</summary>
    public UmamiOptions Options { get; }

    /// <summary>Creates the connector; <paramref name="http"/> is the client used for every call.</summary>
    public UmamiClient(UmamiOptions options, HttpClient http)
    {
        Options = options;
        _http = http;
        var root = options.Url.TrimEnd('/');
        _api = string.IsNullOrEmpty(options.ApiKey) ? $"{root}/api" : root;
    }

    /// <summary>Query string as <c>URLSearchParams</c> writes it.</summary>
    internal static string Query(IEnumerable<KeyValuePair<string, string>> parameters) =>
        string.Join('&', parameters.Select(p => $"{FormEncode(p.Key)}={FormEncode(p.Value)}"));

    /// <summary>application/x-www-form-urlencoded encoding (letters, digits and *-._ kept, space as +).</summary>
    internal static string FormEncode(string s)
    {
        var sb = new StringBuilder();
        foreach (var b in Encoding.UTF8.GetBytes(s))
        {
            var c = (char)b;
            if (char.IsAsciiLetterOrDigit(c) || c is '*' or '-' or '.' or '_') sb.Append(c);
            else if (c == ' ') sb.Append('+');
            else sb.Append('%').Append(b.ToString("X2"));
        }
        return sb.ToString();
    }

    private async Task<string> SignInAsync(CancellationToken ct)
    {
        using var cts = Timeout(ct);
        using var body = new StringContent(JsonSerializer.Serialize(new { username = Options.Username, password = Options.Password }), Encoding.UTF8, "application/json");
        using var r = await _http.PostAsync($"{_api}/auth/login", body, cts.Token).ConfigureAwait(false);
        if (!r.IsSuccessStatusCode) throw new SourceException($"umami login {(int)r.StatusCode}", (int)r.StatusCode);
        var json = JsonNode.Parse(await r.Content.ReadAsStringAsync(cts.Token).ConfigureAwait(false));
        return _token = (string?)At(json, "token") ?? "";
    }

    private Task<string> LoginAsync(CancellationToken ct)
    {
        lock (_gate)
        {
            var task = _signingIn ??= Run();
            if (task.IsCompleted) _signingIn = null; // finished at once: the next sign-in must start a new one
            return task;
            async Task<string> Run()
            {
                try { return await SignInAsync(ct).ConfigureAwait(false); }
                finally { lock (_gate) _signingIn = null; }
            }
        }
    }

    private CancellationTokenSource Timeout(CancellationToken ct)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(Options.Timeout);
        return cts;
    }

    /// <summary>
    /// GET <c>{api}/websites/{id}/{path}?{parameters}</c>, read as JSON. Throws a <see cref="SourceException"/> on a refused answer.
    /// </summary>
    public async Task<JsonNode?> GetAsync(string path, IEnumerable<KeyValuePair<string, string>>? parameters = null, CancellationToken ct = default)
    {
        var q = Query(parameters ?? []);
        var url = $"{_api}/websites/{Uri.EscapeDataString(Options.WebsiteId)}/{path}{(q.Length > 0 ? "?" + q : "")}";
        async Task<HttpResponseMessage> Send()
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrEmpty(Options.ApiKey)) request.Headers.Add("x-umami-api-key", Options.ApiKey);
            else request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token ?? await LoginAsync(ct).ConfigureAwait(false));
            using var cts = Timeout(ct);
            return await _http.SendAsync(request, cts.Token).ConfigureAwait(false);
        }
        var r = await Send().ConfigureAwait(false);
        if (r.StatusCode == HttpStatusCode.Unauthorized && string.IsNullOrEmpty(Options.ApiKey))
        {
            r.Dispose();
            _token = null; // expired token: sign in again once
            r = await Send().ConfigureAwait(false);
        }
        using (r)
        {
            var text = await r.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            if (!r.IsSuccessStatusCode)
            {
                var detail = text.Length > 200 ? text[..200] : text;
                throw new SourceException($"umami {path} {(int)r.StatusCode}{(detail.Length > 0 ? " " + detail : "")}", (int)r.StatusCode);
            }
            return JsonNode.Parse(text);
        }
    }

    /// <summary>Ranking of a dimension; "path" is retried as "url" (Umami 2) if Umami refuses it.</summary>
    internal async Task<List<Point>> MetricAsync(string type, double startAt, double endAt, double limit = 10, CancellationToken ct = default)
    {
        var t = type == "path" ? _pathType : type;
        List<KeyValuePair<string, string>> P(string ty) => [new("startAt", Js.Str(startAt)), new("endAt", Js.Str(endAt)), new("type", ty), new("limit", Js.Str(limit))];
        try
        {
            return Points(await GetAsync("metrics", P(t), ct).ConfigureAwait(false));
        }
        catch (SourceException e) when (type == "path" && _pathType == "path" && e.Status == 400)
        {
            _pathType = "url"; // Umami 2: the dimension is called "url"
            return Points(await GetAsync("metrics", P("url"), ct).ConfigureAwait(false));
        }
    }

    /// <summary>Points [{x, y}] of an answer.</summary>
    internal static List<Point> Points(JsonNode? node) =>
        node is JsonArray a ? [.. a.Select(p => new Point(Str(At(p, "x")) ?? "", Num(At(p, "y"))))] : [];

    /// <summary>Property of a JSON object; null if absent or if the value is not an object (an answer of another shape).</summary>
    internal static JsonNode? At(JsonNode? n, string name) => n is JsonObject o ? o[name] : null;

    internal static string? Str(JsonNode? n) => n is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;

    internal static double Num(JsonNode? n) =>
        n is JsonValue v ? v.TryGetValue<double>(out var d) ? d : v.TryGetValue<string>(out var s) ? Js.Number(s) : 0 : 0;

    /// <summary>Value of an Umami total: number, or {value} object of older versions.</summary>
    internal static double Val(JsonNode? n) =>
        n is JsonValue v && v.TryGetValue<double>(out var d) ? d : n is JsonObject o && o["value"] is JsonValue x && x.TryGetValue<double>(out var y) ? y : 0;

    /// <summary>Totals of a <c>stats</c> answer, whatever the Umami version.</summary>
    public static Totals ParseStats(JsonNode? s) => new(Val(At(s, "pageviews")), Val(At(s, "visitors")), Val(At(s, "visits")), Val(At(s, "bounces")), Val(At(s, "totaltime")));

    /// <summary>Forgets the token.</summary>
    public void Reset()
    {
        _token = null;
        _pathType = "path";
    }
}
