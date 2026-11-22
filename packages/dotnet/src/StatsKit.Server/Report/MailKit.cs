using System.Globalization;
using System.Text.RegularExpressions;

namespace StatsKit.Report;

/// <summary>Complete theme of the report, all shades computed.</summary>
internal sealed record Palette(
    string Brand, string Head, string HeadText, string HeadMuted, string Eyebrow, string Accent, string AccentDeep, string Soft, string Ink, string Text,
    string Muted, string Line, string Page, string Card, string Up, string Down, string Font, string Display, ReportLogo? Logo)
{
    private static readonly Regex Hex = new("^#[0-9a-f]{6}$", RegexOptions.IgnoreCase);
    private const string Fonts = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    public static Palette From(ReportTheme t)
    {
        var brand = Hex.IsMatch(t.Brand) ? t.Brand : "#2f5bd3";
        return new Palette(brand, t.Head ?? brand, t.HeadText ?? "#ffffff", t.HeadMuted ?? Format.MixHex(brand, "#ffffff", 0.82), t.Eyebrow ?? Format.MixHex(brand, "#ffffff", 0.7),
            t.Accent ?? Format.MixHex(brand, "#ffffff", 0.35), brand, t.Soft ?? Format.MixHex(brand, "#ffffff", 0.85), t.Ink ?? "#141a2a", t.Text ?? "#252d40",
            t.Muted ?? "#5a6274", t.Line ?? "#e3e6ee", t.Page ?? "#f4f5f9", t.Card ?? "#ffffff", t.Up ?? "#0b7a5c", t.Down ?? "#b3261e", t.Font ?? Fonts, t.Display ?? Fonts, t.Logo);
    }
}

/// <summary>
/// HTML building blocks of the e-mail report: tables and inline styles only (Outlook shows neither SVG, nor JavaScript, nor most
/// modern CSS). Usable width: 760 px. Every visible text comes from the texts of the chosen language. Same output as the Node server.
/// </summary>
internal sealed class MailKit(Palette c, Texts texts)
{
    public const int MailWidth = 760;
    public const int CardInner = MailWidth - 2 * 24 - 2 * 18 - 2;
    private const string T = "role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"";

    public static string Esc(string? s) => string.Concat((s ?? "").Select(ch => ch is '&' or '<' or '>' or '"' or '\'' ? $"&#{(int)ch};" : ch.ToString()));
    public static string EscLines(string s) => Esc(s).Replace("\n", "<br>");

    public string Font(string size, int weight = 400, string? color = null, string? family = null) => $"font:{weight} {size} {family ?? c.Font};color:{color ?? c.Text}";

    public string Trend(double now, double? before)
    {
        var p = Format.PercentChange(now, before);
        if (p is null) return "&nbsp;";
        return $"<span style=\"color:{(p >= 0 ? c.Up : c.Down)};font-weight:700\">{(p >= 0 ? "▲" : "▼")} {Esc(Format.Percent(texts, p.Value / 100, 0, true))}</span> <span style=\"color:{c.Muted}\">{Esc(texts["report.vsPrevious"])}</span>";
    }

    public string Box(string inner) => $"<table {T} style=\"background:{c.Card};border:1px solid {c.Line};border-radius:14px\"><tr><td style=\"padding:18px\">{inner}</td></tr></table>";
    public string Card(string inner) => $"<tr><td style=\"padding:0 24px 16px 24px\">{Box(inner)}</td></tr>";

    private string Row(List<string> cells) => cells.Count == 1
        ? Card(cells[0])
        : $"<tr><td style=\"padding:0 20px 16px 20px\"><table {T}><tr>{string.Concat(cells.Select(x => $"<td width=\"50%\" valign=\"top\" style=\"padding:0 4px\">{Box(x)}</td>"))}</tr></table></td></tr>";

    /// <summary>Two cards side by side (a single one if the number is odd).</summary>
    public string Pairs(IEnumerable<string> cells)
    {
        var list = cells.Where(x => x.Length > 0).ToList();
        return string.Join("\n", Enumerable.Range(0, (list.Count + 1) / 2).Select(i => Row(list.Skip(i * 2).Take(2).ToList())));
    }

    public string H2(string title, string hint = "") =>
        $"<div style=\"{Font("15px", 700, c.Ink)};letter-spacing:-0.01em\">{Esc(title)}</div>{(hint.Length > 0 ? $"<div style=\"{Font("12px", 400, c.Muted)};margin-top:2px\">{Esc(hint)}</div>" : "")}<div style=\"height:6px;line-height:6px;font-size:0\">&nbsp;</div>";

    public string Kpi(string value, string label, string sub, string width) =>
        $"<td width=\"{width}\" valign=\"top\" style=\"padding:0 4px 8px\"><table {T} style=\"background:{c.Card};border:1px solid {c.Line};border-radius:12px\"><tr><td style=\"padding:14px 14px 12px\"><div style=\"{Font("28px/1.1", 800, c.Ink, c.Display)};letter-spacing:-0.03em\">{Esc(value)}</div><div style=\"{Font("12px", 400, c.Muted)};margin-top:2px\">{Esc(label)}</div><div style=\"{Font("11px")};margin-top:6px;min-height:14px\">{sub}</div></td></tr></table></td>";

    /// <summary>Row of key figures, completed to keep cards of the same width.</summary>
    public string KpiRow(IEnumerable<(string Value, string Label, string Sub)> kpis, int columns = 4)
    {
        var width = $"{(100.0 / columns).ToString("F2", CultureInfo.InvariantCulture)}%";
        var cells = kpis.Select(k => Kpi(k.Value, k.Label, k.Sub, width)).ToList();
        while (cells.Count % columns != 0) cells.Add($"<td width=\"{width}\"></td>");
        var rows = new List<string>();
        for (var i = 0; i < cells.Count; i += columns) rows.Add($"<tr><td style=\"padding:0 20px\"><table {T}><tr>{string.Concat(cells.Skip(i).Take(columns))}</tr></table></td></tr>");
        return string.Concat(rows);
    }

    /// <summary>Ranking: label and number, proportional bar below.</summary>
    public (string Inner, string Text) List(string title, List<(string Label, double Value)> rows, string hint = "")
    {
        if (rows.Count == 0) return ("", "");
        var max = Math.Max(1, rows.Max(r => r.Value));
        var html = rows.Select(r =>
        {
            var w = (int)Math.Min(100, Math.Max(4, Js.Round(r.Value / max * 100)));
            return $"<tr><td style=\"padding-top:7px;{Font("13px")}\">{Esc(r.Label)}</td><td align=\"right\" style=\"padding-top:7px;{Font("13px", 700, c.Ink)}\">{Esc(Format.Number(texts, r.Value))}</td></tr><tr><td colspan=\"2\" style=\"padding-top:3px\"><table {T}><tr><td width=\"{w}%\" height=\"6\" bgcolor=\"{c.Accent}\" style=\"background:{c.Accent};border-radius:3px;font-size:0;line-height:0\">&nbsp;</td>{(w < 100 ? "<td style=\"font-size:0;line-height:0\">&nbsp;</td>" : "")}</tr></table></td></tr>";
        });
        return ($"{H2(title, hint)}<table {T}>{string.Concat(html)}</table>",
            $"\n{Format.Upper(title)}\n{string.Join("\n", rows.Select(r => $"  - {Format.LabelValue(texts, r.Label, Format.Number(texts, r.Value))}"))}\n");
    }

    /// <summary>
    /// Vertical bars (one per slot), first and last labels below. With <paramref name="previous"/> (same length), each slot shows
    /// the bar of the previous period next to it, lighter, and a legend (<paramref name="legend"/>: period, previous period).
    /// </summary>
    public string Bars(IReadOnlyList<double> values, string first, string last, IReadOnlyList<string> titles, IReadOnlyList<double>? previous = null, (string Current, string Previous)? legend = null)
    {
        var prev = previous is not null && previous.Count == values.Count ? previous : null;
        var max = Math.Max(1, values.Concat(prev ?? []).DefaultIfEmpty(0).Max());
        const int H = 110;
        var ghost = Format.MixHex(c.Line, c.Muted, 0.25);
        string Bar(double v, string color) => $"<td valign=\"bottom\" style=\"padding:0\"><table {T}><tr><td height=\"{(int)Math.Max(2, Js.Round(v / max * H))}\" bgcolor=\"{color}\" style=\"background:{color};border-radius:3px 3px 0 0;font-size:0;line-height:0\">&nbsp;</td></tr></table></td>";
        var cells = values.Select((v, i) => $"<td valign=\"bottom\" style=\"padding:0 1px\" title=\"{Esc(titles[i])}\"><table {T}><tr>{(prev is not null ? Bar(prev[i], ghost) : "")}{Bar(v, c.AccentDeep)}</tr></table></td>");
        string Swatch(string color) => $"<td width=\"10\" height=\"10\" bgcolor=\"{color}\" style=\"background:{color};font-size:0;line-height:0\">&nbsp;</td>";
        var key = prev is not null && legend is { } l
            ? $"<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-top:8px\"><tr>{Swatch(c.AccentDeep)}<td style=\"padding:0 14px 0 6px;{Font("11px", 400, c.Muted)}\">{Esc(l.Current)}</td>{Swatch(ghost)}<td style=\"padding-left:6px;{Font("11px", 400, c.Muted)}\">{Esc(l.Previous)}</td></tr></table>"
            : "";
        return $"<table {T} height=\"{H}\"><tr>{string.Concat(cells)}</tr></table><table {T} style=\"margin-top:6px\"><tr><td style=\"{Font("11px", 400, c.Muted)}\">{Esc(first)}</td><td align=\"right\" style=\"{Font("11px", 400, c.Muted)}\">{Esc(last)}</td></tr></table>{key}";
    }

    /// <summary>Bulleted lines (already formatted texts).</summary>
    public string Bullets(IEnumerable<string> lines) =>
        $"<table {T}>{string.Concat(lines.Select(l => $"<tr><td width=\"14\" valign=\"top\" style=\"padding:4px 0;{Font("13px", 400, c.AccentDeep)}\">●</td><td style=\"padding:4px 0;{Font("13px/1.5")}\">{Esc(l)}</td></tr>"))}</table>";

    /// <summary>7 × 24 heatmap; <paramref name="days"/> are the short weekday names, Monday first.</summary>
    public string Heat(IReadOnlyList<IReadOnlyList<double>> grid, IReadOnlyList<string> days)
    {
        var max = Math.Max(1, grid.SelectMany(r => r).DefaultIfEmpty(0).Max());
        var head = $"<tr><td width=\"4%\"></td>{string.Concat(Enumerable.Range(0, 24).Select(h => $"<td width=\"4%\" align=\"center\" style=\"{Font("9px", 400, c.Muted)}\">{(h % 3 == 0 ? Esc(Format.Number(texts, h)) : "")}</td>"))}</tr>";
        var rows = grid.Select((r, d) => $"<tr><td style=\"{Font("10px", 400, c.Muted)};padding-right:4px\">{Esc(days[d])}</td>{string.Concat(r.Select(y => $"<td width=\"4%\" height=\"15\" bgcolor=\"{(y != 0 ? Format.MixHex(c.Soft, c.AccentDeep, 0.15 + 0.85 * (y / max)) : c.Page)}\" style=\"border:1px solid {c.Card};font-size:0;line-height:0\">&nbsp;</td>"))}</tr>");
        return $"<table {T}>{head}{string.Concat(rows)}</table>";
    }

    public string Button(string href, string label) =>
        $"<tr><td align=\"center\" style=\"padding:8px 24px 8px\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"{c.AccentDeep}\" style=\"background:{c.AccentDeep};border-radius:999px\"><a href=\"{Esc(href)}\" style=\"display:inline-block;padding:13px 26px;{Font("14px", 700, "#ffffff")};text-decoration:none\">{Esc(label)}</a></td></tr></table></td></tr>";

    public string Header(string eyebrow, string title, string subtitle, string logo) =>
        $"<tr><td style=\"padding:0 24px 16px 24px\"><table {T} bgcolor=\"{c.Head}\" style=\"background:{c.Head};border-radius:16px\"><tr><td style=\"padding:26px 28px\">{(logo.Length > 0 ? $"<div style=\"margin-bottom:14px\">{logo}</div>" : "")}<div style=\"{Font("12px", 700, c.Eyebrow)};letter-spacing:0.14em;text-transform:uppercase\">{Esc(eyebrow)}</div><div style=\"{Font("26px/1.2", 800, c.HeadText, c.Display)};margin-top:8px;letter-spacing:-0.02em\">{Esc(title)}</div><div style=\"{Font("14px", 400, c.HeadMuted)};margin-top:6px\">{Esc(subtitle)}</div></td></tr></table></td></tr>";

    public string Note(string text) => $"<tr><td style=\"padding:0 24px 16px;{Font("13px/1.5", 400, c.Muted)}\">{Esc(text)}</td></tr>";
    public string Callout(string html) => $"<tr><td style=\"padding:0 24px 16px\"><table {T} style=\"background:{c.Soft};border-radius:12px\"><tr><td style=\"padding:14px 16px;{Font("14px/1.5", 400, c.Ink)}\">{html}</td></tr></table></td></tr>";
    public string Paragraph(string text) => $"<tr><td style=\"padding:0 24px 16px;{Font("15px/1.6", 400, c.Ink)}\">{EscLines(text)}</td></tr>";
    public string Footer(string text) => $"<tr><td align=\"center\" style=\"padding:14px 24px 0;{Font("12px/1.6", 400, c.Muted)}\">{EscLines(text)}</td></tr>";

    /// <summary>Complete document: <paramref name="rows"/> = &lt;tr&gt; rows already assembled.</summary>
    public string Page(string title, string preheader, string rows) => $"""
        <!doctype html><html lang="{Esc(texts.Locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{Esc(title)}</title>
        <!--[if mso]><style>table{"{"}border-collapse:collapse{"}"}td{"{"}font-family:Arial,sans-serif{"}"}</style><![endif]--></head>
        <body style="margin:0;padding:0;background:{c.Page}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:{c.Page}">{Esc(preheader)}</div>
        <table {T} bgcolor="{c.Page}" style="background:{c.Page}"><tr><td align="center" style="padding:24px 8px">
        <!--[if mso]><table role="presentation" width="{MailWidth}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="{MailWidth}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:{MailWidth}px">
        {rows}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
        </td></tr></table></body></html>
        """.Replace(CrLf, "\n");

    private const string CrLf = "\r\n";
}
