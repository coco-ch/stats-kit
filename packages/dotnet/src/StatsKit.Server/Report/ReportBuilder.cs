using System.Text.RegularExpressions;

namespace StatsKit.Report;

/// <summary>Attachment shown in the message ("cid:").</summary>
public sealed record InlineAttachment(string Cid, string FileName, string ContentType, byte[] Content);

/// <summary>Key figure of a site-specific card.</summary>
public sealed record ReportFigure(string Value, string Label, string? Sub = null);

/// <summary>Site-specific card of the report: a title, then figures and/or lines, all given by the site in its language.</summary>
/// <param name="Figures">Key figures, side by side (up to three per row).</param>
/// <param name="Lines">Lines of text, bulleted.</param>
public sealed record ReportBlock(string Title, string? Hint = null, IReadOnlyList<ReportFigure>? Figures = null, IReadOnlyList<string>? Lines = null);

/// <summary>Message ready to be handed to the site's sending function.</summary>
public sealed record ReportMessage(string Subject, string Html, string Text, IReadOnlyList<InlineAttachment> Attachments)
{
    /// <summary>The message with its images included in the page, to be shown outside a mail client.</summary>
    public string PreviewHtml => Attachments.Aggregate(Html, (html, a) => html.Replace($"cid:{a.Cid}", $"data:{a.ContentType};base64,{Convert.ToBase64String(a.Content)}", StringComparison.Ordinal));
}

/// <summary>
/// Traffic report by e-mail (weekly or on demand): key figures with trends, goals, site data, world map (attached PNG, "cid:"),
/// page views per day, heatmap, rankings, and a plain-text version. Same message as the Node server.
/// </summary>
public static partial class ReportBuilder
{
    /// <summary>Content id of the map image.</summary>
    public const string MapCid = "stats-kit-map";
    /// <summary>Content id of the logo image.</summary>
    public const string LogoCid = "stats-kit-logo";

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"\s*\(\s*\)")]
    private static partial Regex EmptyBrackets();

    [GeneratedRegex(@"\n{3,}")]
    private static partial Regex BlankLines();

    private static Dictionary<string, string> V(params (string Key, string Value)[] pairs) => pairs.ToDictionary(p => p.Key, p => p.Value);

    private static double? AsNumber(object value) => value switch
    {
        double d => d, float f => f, decimal m => (double)m, int i => i, long l => l, short s => s, byte b => b,
        System.Text.Json.JsonElement { ValueKind: System.Text.Json.JsonValueKind.Number } e => e.GetDouble(),
        _ => null,
    };

    private static string TrimEnd(string s) => s.TrimEnd();

    /// <summary>Builds the report of an overview.</summary>
    /// <param name="glance">Adds the "At a glance" card (top source, country, page and entry page, best day, busiest slot).</param>
    /// <param name="blocks">Site-specific cards, shown after the rankings.</param>
    public static ReportMessage Build(StatsOverview o, Texts texts, ReportTheme theme, string siteName, string? statsUrl = null, bool weekly = false, bool worldMap = true,
        bool glance = true, IReadOnlyList<ReportBlock>? blocks = null)
    {
        string R(string key) => texts["report." + key];
        var c = Palette.From(theme);
        var k = new MailKit(c, texts);
        string Nf(double v, int d = 0) => Format.Number(texts, v, d);
        string Lv(string label, string value) => Format.LabelValue(texts, label, value);
        var tz = o.Range.TimeZone;
        var last = Js.Iso(Js.ParseInstant(o.Range.To) - 1);
        var from = Format.ShortDate(texts, o.Range.From, tz);
        var to = Format.ShortDate(texts, last, tz);
        var period = Texts.Fill(texts["periods.short"], V(("from", from), ("to", to)));
        var ok = o.Status == "ok";
        var s = o.Totals;
        var p = o.Previous;
        var change = ok ? Format.PercentChange(s.Visitors, p?.Visitors) : null;
        // the totals are also available to the subject, the title, the introduction and the footer ({visitors}, {change}…)
        var vars = V(("site", siteName), ("from", from), ("to", to), ("period", period), ("days", Js.Str(o.Range.Days)),
            ("visitors", ok ? Nf(s.Visitors) : ""), ("pageviews", ok ? Nf(s.Pageviews) : ""), ("visits", ok ? Nf(s.Visits) : ""),
            ("change", change is null ? "" : Format.Percent(texts, change.Value / 100, 0, true)));
        var attachments = new List<InlineAttachment>();
        var rows = new List<string>();
        var text = new List<string> { $"{siteName} — {R("title")} ({Texts.Fill(R("subtitle"), vars)})", "" };

        var logo = "";
        if (c.Logo is { } l)
        {
            var size = $" width=\"{l.Width ?? 120}\"{(l.Height is { } h ? $" height=\"{h}\"" : "")}";
            if (l.Png is { } png)
            {
                attachments.Add(new InlineAttachment(LogoCid, "logo.png", "image/png", png));
                logo = $"<img src=\"cid:{LogoCid}\"{size} alt=\"{MailKit.Esc(l.Alt ?? siteName)}\" style=\"display:block;border:0;height:auto\">";
            }
            else if (l.Url is { } url)
            {
                logo = $"<img src=\"{MailKit.Esc(url)}\"{size} alt=\"{MailKit.Esc(l.Alt ?? siteName)}\" style=\"display:block;border:0;height:auto\">";
            }
        }
        rows.Add(k.Header(siteName, R("title"), Texts.Fill(R("subtitle"), vars), logo));
        if (R("intro").Length > 0)
        {
            rows.Add(k.Paragraph(Texts.Fill(R("intro"), vars)));
            text.Add(Texts.Fill(R("intro"), vars));
            text.Add("");
        }

        if (ok)
        {
            var bounce = Format.Percent(texts, s.Visits != 0 ? s.Bounces / s.Visits : 0, 0);
            var avg = Texts.Fill(R("avgDuration"), V(("d", Format.Duration(texts, s.Visits != 0 ? Js.Round(s.Totaltime / s.Visits) : 0))));
            rows.Add(k.KpiRow([
                (Nf(s.Visitors), R("visitors"), k.Trend(s.Visitors, p?.Visitors)),
                (Nf(s.Pageviews), R("pageviews"), k.Trend(s.Pageviews, p?.Pageviews)),
                (Nf(s.Visits), R("visits"), k.Trend(s.Visits, p?.Visits)),
                (bounce, R("bounce"), $"<span style=\"color:{c.Muted}\">{MailKit.Esc(avg)}</span>"),
            ]));
            string T(double n, double? b) => Format.PercentChange(n, b) is { } ch ? $"  ({Format.Percent(texts, ch / 100, 0, true)})" : "";
            text.Add(Lv(R("visitors"), $"{Nf(s.Visitors)}{T(s.Visitors, p?.Visitors)}"));
            text.Add(Lv(R("pageviews"), $"{Nf(s.Pageviews)}{T(s.Pageviews, p?.Pageviews)}"));
            text.Add(Lv(R("visits"), $"{Nf(s.Visits)}{T(s.Visits, p?.Visits)}"));
            text.Add(Lv(R("bounce"), $"{bounce}, {avg}"));
            if (o.Goals.Count > 0)
            {
                rows.Add(k.KpiRow(o.Goals.Select(g => (Nf(g.Value), g.Label, k.Trend(g.Value, g.Previous)))));
                foreach (var g in o.Goals) text.Add(Lv(g.Label, $"{Nf(g.Value)}{T(g.Value, g.Previous)}"));
            }
        }
        else
        {
            var note = o.Status == "not-configured" ? R("notConfigured") : R("unavailable");
            rows.Add(k.Note(note));
            text.Add(note);
        }

        var extras = o.Extras;
        if (extras is { Tiles.Count: > 0 })
        {
            string Value(ExtraTile x) => AsNumber(x.Value) is { } n ? Nf(n) : x.Value.ToString() ?? "";
            var plain = extras.Tiles.Where(x => !x.Highlight).ToList();
            var strong = extras.Tiles.Where(x => x.Highlight).ToList();
            if (plain.Count > 0)
                rows.Add(k.KpiRow(plain.Select(x => (Value(x), x.Label, AsNumber(x.Value) is { } n ? k.Trend(n, x.Previous) : x.Sub is { Length: > 0 } sub ? MailKit.Esc(sub) : ""))));
            string Link(ExtraTile x) => x.Link is { } l ? $" <a href=\"{MailKit.Esc(l.Url)}\" style=\"color:{c.AccentDeep}\">{MailKit.Esc(l.Label)}</a>" : "";
            foreach (var x in strong) rows.Add(k.Callout($"<b>{MailKit.Esc(Lv(x.Label, Value(x)))}</b>{(x.Sub is { Length: > 0 } sub ? $" — {MailKit.Esc(sub)}" : "")}{Link(x)}"));
            foreach (var x in extras.Tiles) text.Add($"{Lv(x.Label, Value(x))}{(x.Sub is { Length: > 0 } sub ? $" ({sub})" : "")}{(x.Highlight && x.Link is { } go ? $" {go.Url}" : "")}");
        }
        rows.Add("<tr><td style=\"font-size:0;line-height:8px\">&nbsp;</td></tr>");

        var ser = o.Series;
        var bestIndex = 0;
        for (var i = 0; i < ser.Pageviews.Count; i++) if (ser.Pageviews[i] > ser.Pageviews[bestIndex]) bestIndex = i;
        string Label(string slot) => Format.SlotLabel(texts, slot, ser.Unit);
        var bestDay = ok && ser.Pageviews.Count > 0 && ser.Pageviews[bestIndex] != 0
            ? Texts.Fill(R("bestDay"), V(("d", ser.Unit == "day" ? Format.LongDay(texts, ser.Slots[bestIndex]) : Label(ser.Slots[bestIndex])), ("n", Nf(ser.Pageviews[bestIndex]))))
            : "";
        var slotBest = ok ? Format.BestSlot(o.Heatmap) : null;
        var when = slotBest is { } sb ? Texts.Fill(R("slot"), V(("day", Format.WeekdayName(texts, sb.Day)), ("hour", Format.HourName(texts, sb.Hour)))) : "";

        if (ok && glance)
        {
            var b = o.Breakdowns;
            string First(string template, IReadOnlyList<Item> items, Func<Item, string> name) =>
                items.Count > 0 && items[0].Value != 0 ? Texts.Fill(template, V(("label", name(items[0])), ("n", Nf(items[0].Value)))) : "";
            var lines = new[]
            {
                First(R("glanceSource"), b.Referrers, i => i.Label ?? (i.Key.Length > 0 ? i.Key : texts["common.direct"])),
                First(R("glanceCountry"), b.Countries, i => Format.CountryName(texts, i.Key)),
                First(R("glancePage"), b.Pages, i => i.Label ?? i.Key),
                First(R("glanceEntry"), b.Entries, i => i.Label ?? i.Key),
                bestDay,
                when.Length > 0 ? Texts.Fill(R("glanceSlot"), V(("slot", when))) : "",
            }.Where(x => x.Length > 0).ToList();
            if (lines.Count > 0)
            {
                rows.Add(k.Card($"{k.H2(R("glanceTitle"))}{k.Bullets(lines)}"));
                text.Add("");
                text.Add(Format.Upper(R("glanceTitle")));
                text.AddRange(lines.Select(x => $"  - {x}"));
            }
        }

        if (ok && worldMap && o.Breakdowns.Countries.Count > 0)
        {
            byte[] Rgb(string hex) => [.. Format.Rgb(hex).Select(v => (byte)v)];
            var map = MapPng.Render(o.Breakdowns.Countries.Select(i => (i.Key, i.Value)), new MapColors(
                Rgb(Format.MixHex(c.Brand, "#ffffff", 0.94)), Rgb(Format.MixHex(c.Brand, "#d9dce4", 0.86)), [255, 255, 255], Rgb(Format.MixHex(c.Brand, "#ffffff", 0.65)), Rgb(c.Brand)));
            attachments.Add(new InlineAttachment(MapCid, "map.png", "image/png", map.Png));
            rows.Add(k.Card($"{k.H2(R("mapTitle"), R("mapHint"))}<img src=\"cid:{MapCid}\" width=\"{MailKit.CardInner}\" alt=\"{MailKit.Esc(R("mapAlt"))}\" style=\"display:block;width:100%;max-width:{MailKit.CardInner}px;height:auto;border-radius:10px;border:0\">"));
        }

        if (ok && ser.Slots.Count > 1)
        {
            var prev = ser.PreviousPageviews;
            var titles = ser.Slots.Select((x, i) => Lv(Label(x), prev is not null ? $"{Nf(ser.Pageviews[i])} / {Nf(i < prev.Count ? prev[i] : 0)}" : Nf(ser.Pageviews[i]))).ToList();
            rows.Add(k.Card($"{k.H2(R("dailyTitle"), bestDay)}{k.Bars(ser.Pageviews, Label(ser.Slots[0]), Label(ser.Slots[^1]), titles, prev, (R("dailyCurrent"), R("dailyPrevious")))}"));
            if (bestDay.Length > 0 && !glance) { text.Add(""); text.Add(bestDay); }
        }
        if (slotBest is not null)
        {
            var days = Enumerable.Range(0, 7).Select(d => Format.WeekdayName(texts, d, true)).ToList();
            rows.Add(k.Card($"{k.H2(R("heatTitle"), Texts.Fill(R("heatHint"), V(("slot", when), ("tz", tz))))}{k.Heat(o.Heatmap, days)}"));
            text.Add(Texts.Fill(R("heatHint"), V(("slot", when), ("tz", tz))));
        }

        // rankings
        var lists = new List<(string Title, List<(string, double)> Rows, string Hint)>();
        static string Own(Item i) => i.Label ?? i.Key;
        static List<(string, double)> Top(IReadOnlyList<Item>? items, Func<Item, string> label, int n = 6) => [.. (items ?? []).Take(n).Select(i => (label(i), i.Value))];
        if (ok)
        {
            var b = o.Breakdowns;
            lists.Add((R("pages"), Top(b.Pages, Own), ""));
            lists.Add((R("referrers"), Top(b.Referrers, i => i.Label ?? (i.Key.Length > 0 ? i.Key : texts["common.direct"])), ""));
            lists.Add((R("countries"), Top(b.Countries, i => Format.CountryName(texts, i.Key)), ""));
            lists.Add((R("cities"), Top(b.Cities, Own), ""));
            lists.Add((R("entries"), Top(b.Entries, Own), R("entriesHint")));
            lists.Add((R("exits"), Top(b.Exits, Own), R("exitsHint")));
            lists.Add((R("events"), Top(b.Events, Own), R("eventsHint")));
            foreach (var grp in o.Groups) lists.Add((grp.Title, Top(grp.Items, Own), ""));
            lists.Add((R("languages"), Top(b.SiteLanguages.Count > 0 ? b.SiteLanguages : b.Languages, i => Format.LanguageName(texts, i.Key)), ""));
            lists.Add((R("devices"), Top(b.Devices, i => Format.DeviceName(texts, i.Key)), ""));
            lists.Add((R("browsers"), Top(b.Browsers, i => i.Label ?? Format.BrowserName(i.Key)), ""));
        }
        foreach (var t in extras?.Tables ?? []) lists.Add((t.Title, Top(t.Items, Own), t.Sub ?? ""));
        var shown = lists.Select(x => k.List(x.Title, x.Rows, x.Hint)).ToList();
        rows.Add(k.Pairs(shown.Select(x => x.Inner)));
        foreach (var x in shown) if (x.Text.Length > 0) text.Add(TrimEnd(x.Text));

        // site-specific cards
        foreach (var blk in blocks ?? [])
        {
            var figures = blk.Figures ?? [];
            var lines = blk.Lines ?? [];
            var cells = figures.Select(f => k.Kpi(f.Value, f.Label, f.Sub is { Length: > 0 } sub ? $"<span style=\"color:{c.Muted}\">{MailKit.Esc(sub)}</span>" : "", "33.33%")).ToList();
            var table = cells.Count > 0
                ? $"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">{string.Concat(Enumerable.Range(0, (cells.Count + 2) / 3).Select(i => $"<tr>{string.Concat(cells.Skip(i * 3).Take(3))}</tr>"))}</table>"
                : "";
            rows.Add(k.Card($"{k.H2(blk.Title, blk.Hint ?? "")}{table}{(lines.Count > 0 ? k.Bullets(lines) : "")}"));
            text.Add("");
            text.Add(Format.Upper(blk.Title));
            text.AddRange(figures.Select(f => $"  - {Lv(f.Label, f.Value)}{(f.Sub is { Length: > 0 } sub ? $" ({sub})" : "")}"));
            text.AddRange(lines.Select(l => $"  - {l}"));
        }

        if (!string.IsNullOrEmpty(statsUrl))
        {
            rows.Add(k.Button(statsUrl, R("button")));
            text.Add("");
            text.Add(Texts.Fill(R("textLink"), V(("url", statsUrl))));
        }
        else if (!string.IsNullOrEmpty(o.DashboardUrl))
        {
            rows.Add(k.Button(o.DashboardUrl, R("dashboardButton")));
            text.Add("");
            text.Add(Texts.Fill(R("textLink"), V(("url", o.DashboardUrl))));
        }
        if (R("footer").Length > 0)
        {
            rows.Add(k.Footer(Texts.Fill(R("footer"), vars)));
            text.Add("");
            text.Add(Texts.Fill(R("footer"), vars));
        }

        // a variable without value ({change} without a previous period) leaves no empty brackets behind
        var subject = Spaces().Replace(EmptyBrackets().Replace(Texts.Fill(weekly ? R("subjectWeekly") : R("subject"), vars), ""), " ").Trim();
        var pre = ok
            ? Texts.Fill(R("preheader"), new Dictionary<string, string>(vars) { ["visitors"] = Nf(s.Visitors), ["pageviews"] = Nf(s.Pageviews) })
            : Texts.Fill(R("preheaderEmpty"), vars);
        return new ReportMessage(subject, k.Page(subject, pre, string.Join("\n", rows)), BlankLines().Replace(string.Join("\n", text), "\n\n") + "\n", attachments);
    }
}
