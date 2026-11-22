using System.Globalization;
using System.Text.RegularExpressions;

namespace StatsKit.Report;

/// <summary>Colours of the report in dark mode.</summary>
internal sealed record DarkPalette(string Page, string Card, string Line, string Soft, string Ink, string Text, string Muted, string Accent, string Up, string Down);

/// <summary>Complete theme of the report, all shades computed.</summary>
internal sealed record Palette(
    string Brand, string Head, string HeadText, string HeadMuted, string Eyebrow, string Accent, string AccentDeep, string Soft, string Ink, string Text,
    string Muted, string Line, string Page, string Card, string Up, string Down, string Font, string Display, ReportLogo? Logo, MapColors Map, DarkPalette Dark, string WarnSoft = "#fff3d6", string WarnInk = "#5a3b00")
{
    private static readonly Regex Hex = new("^#[0-9a-f]{6}$", RegexOptions.IgnoreCase);
    private const string Fonts = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    private static string HexOr(string? v, string fallback) => v is not null && Hex.IsMatch(v) ? v : fallback;
    private static byte[] Rgb(string hex) => [.. Format.Rgb(hex).Select(v => (byte)v)];

    public static Palette From(ReportTheme t)
    {
        var brand = Hex.IsMatch(t.Brand) ? t.Brand : "#2f5bd3";
        var m = t.Map;
        var d = t.Dark;
        var map = new MapColors(
            Rgb(HexOr(m?.Background, Format.MixHex(brand, "#ffffff", 0.94))), Rgb(HexOr(m?.Land, Format.MixHex(brand, "#d9dce4", 0.86))), Rgb(HexOr(m?.Border, "#ffffff")),
            Rgb(HexOr(m?.Low, Format.MixHex(brand, "#ffffff", 0.65))), Rgb(HexOr(m?.High, brand)));
        var dark = new DarkPalette(
            HexOr(d?.Page, "#111318"), HexOr(d?.Card, "#1b1e26"), HexOr(d?.Line, "#2e323d"), HexOr(d?.Soft, Format.MixHex(brand, "#1b1e26", 0.8)), HexOr(d?.Ink, "#f3f4f8"),
            HexOr(d?.Text, "#d5d9e2"), HexOr(d?.Muted, "#a3aab8"), HexOr(d?.Accent, Format.MixHex(brand, "#ffffff", 0.4)), HexOr(d?.Up, "#4fc28e"), HexOr(d?.Down, "#ff8a80"));
        return new Palette(brand, t.Head ?? brand, t.HeadText ?? "#ffffff", t.HeadMuted ?? Format.MixHex(brand, "#ffffff", 0.82), t.Eyebrow ?? Format.MixHex(brand, "#ffffff", 0.7),
            t.Accent ?? Format.MixHex(brand, "#ffffff", 0.35), brand, t.Soft ?? Format.MixHex(brand, "#ffffff", 0.85), t.Ink ?? "#141a2a", t.Text ?? "#252d40",
            t.Muted ?? "#5a6274", t.Line ?? "#e3e6ee", t.Page ?? "#f4f5f9", t.Card ?? "#ffffff", t.Up ?? "#0b7a5c", t.Down ?? "#b3261e", t.Font ?? Fonts, t.Display ?? Fonts, t.Logo,
            map, dark, HexOr(t.WarnSoft, "#fff3d6"), HexOr(t.WarnInk, "#5a3b00"));
    }
}

/// <summary>A figure of a row: value, label, line under it (HTML), optional image (HTML).</summary>
internal sealed record Figure(string Value, string Label, string Sub, string Image = "");

/// <summary>Line of a "rising and falling" list: label, small word after it, change, tone ("up", "down", "flat").</summary>
internal sealed record MoveRow(string Label, string Tag, string Text, string Tone);

/// <summary>
/// HTML building blocks of the e-mail report: tables and inline styles only (Outlook shows neither SVG, nor JavaScript, nor most
/// modern CSS). Usable width: 760 px. Every visible text comes from the texts of the chosen language. Same output as the Node
/// server, style sheet included: key figures two by two and cards on one column under 600 px, dark mode for the clients that read it.
/// </summary>
internal sealed class MailKit(Palette c, Texts texts)
{
    public const int MailWidth = 760;
    public const int CardInner = MailWidth - 2 * 24 - 2 * 18 - 2;
    private const string T = "role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"";

    public static string Esc(string? s) => string.Concat((s ?? "").Select(ch => ch is '&' or '<' or '>' or '"' or '\'' ? $"&#{(int)ch};" : ch.ToString()));
    public static string EscLines(string s) => Esc(s).Replace("\n", "<br>");

    /// <summary>Class of a text colour (dark mode).</summary>
    private string Role(string color) =>
        color == c.Ink ? "sk-ink" : color == c.Text ? "sk-tx" : color == c.Muted ? "sk-mu" : color == c.AccentDeep ? "sk-ac" : color == c.Up ? "sk-up" : color == c.Down ? "sk-dn" : "";

    /// <summary><c>class</c> and <c>style</c> attributes of a text: size ("13px" or "13px/1.5"), weight, colour, font; <paramref name="more"/>: other styles.</summary>
    public string Ts(string size, int weight = 400, string? color = null, string? family = null, string more = "", string extraClass = "")
    {
        color ??= c.Text;
        family ??= c.Font;
        var cls = string.Join(' ', new[] { Role(color), extraClass }.Where(x => x.Length > 0));
        var parts = size.Split('/');
        // the text font is inherited from the card (set once per card: lighter message); only another font is repeated
        var font = family == c.Font
            ? $"font-size:{parts[0]}{(parts.Length > 1 ? $";line-height:{parts[1]}" : "")}{(weight == 400 ? "" : $";font-weight:{weight}")}"
            : $"font:{weight} {size} {family}";
        return $"{(cls.Length > 0 ? $"class=\"{cls}\" " : "")}style=\"{font};color:{color}{(more.Length > 0 ? $";{more}" : "")}\"";
    }

    /// <summary>Change shown under a figure: arrow, text, tone; "vs previous period" after it.</summary>
    public string Delta(string text, string tone, string arrow)
    {
        var color = tone == "up" ? c.Up : tone == "down" ? c.Down : c.Muted;
        return $"<span class=\"{Role(color)}\" style=\"color:{color};font-weight:700\">{arrow} {Esc(text)}</span> <span class=\"sk-mu\" style=\"color:{c.Muted}\">{Esc(texts["report.vsPrevious"])}</span>";
    }

    /// <summary>Relative change (whole percentage); <paramref name="lowerIsBetter"/> for a figure that should go down.</summary>
    public string Trend(double now, double? before, bool lowerIsBetter = false)
    {
        var p = Format.PercentChange(now, before);
        if (p is null) return "&nbsp;";
        if (p == 0) return Delta(Format.Percent(texts, 0, 0), "flat", "=");
        var good = lowerIsBetter ? p < 0 : p > 0;
        return Delta(Format.Percent(texts, p.Value / 100, 0, true), good ? "up" : "down", p >= 0 ? "▲" : "▼");
    }

    /// <summary>Absolute change (rounded to <paramref name="digits"/>), with a unit template ("{n} pt"); <paramref name="lowerIsBetter"/> for a rate of bounces, a position.</summary>
    public string Gap(double now, double? before, int digits, string? unit, bool lowerIsBetter)
    {
        if (before is not { } b || !double.IsFinite(b)) return "&nbsp;";
        var f = Math.Pow(10, digits);
        var d = Js.Round((now - b) * f) / f;
        string N(double v, bool signed)
        {
            var s = Format.Number(texts, v, digits, signed);
            return unit is null ? s : Texts.Fill(unit, new Dictionary<string, string> { ["n"] = s });
        }
        if (d == 0) return Delta(N(0, false), "flat", "=");
        var good = lowerIsBetter ? d < 0 : d > 0;
        return Delta(N(d, true), good ? "up" : "down", d > 0 ? "▲" : "▼");
    }

    public string Box(string inner) => $"<table {T} class=\"sk-card\" style=\"background:{c.Card};border:1px solid {c.Line};border-radius:14px\"><tr><td class=\"sk-in\" style=\"padding:18px;font-family:{c.Font}\">{inner}</td></tr></table>";
    public string Card(string inner) => $"<tr><td class=\"sk-px\" style=\"padding:0 24px 16px 24px\">{Box(inner)}</td></tr>";

    private string Row(List<string> cells) => cells.Count == 1
        ? Card(cells[0])
        : $"<tr><td class=\"sk-px sk-pr\" style=\"padding:0 20px 16px 20px\"><table {T}><tr>{string.Concat(cells.Select(x => $"<td class=\"sk-col\" width=\"50%\" valign=\"top\" style=\"padding:0 4px\">{Box(x)}</td>"))}</tr></table></td></tr>";

    /// <summary>Two cards side by side (a single one if the number is odd); one above the other on a phone.</summary>
    public string Pairs(IEnumerable<string> cells)
    {
        var list = cells.Where(x => x.Length > 0).ToList();
        return string.Join("\n", Enumerable.Range(0, (list.Count + 1) / 2).Select(i => Row(list.Skip(i * 2).Take(2).ToList())));
    }

    /// <summary>Two blocks side by side inside a card (one above the other on a phone).</summary>
    public string Split(string a, string b) =>
        $"<table {T}><tr><td class=\"sk-col\" width=\"50%\" valign=\"top\" style=\"padding:0 10px 0 0\">{a}</td><td class=\"sk-col\" width=\"50%\" valign=\"top\" style=\"padding:0 0 0 10px\">{b}</td></tr></table>";

    public string H2(string title, string hint = "") =>
        $"<div {Ts("15px", 700, c.Ink, c.Font, "letter-spacing:-0.01em")}>{Esc(title)}</div>{(hint.Length > 0 ? $"<div {Ts("12px", 400, c.Muted, c.Font, "margin-top:2px")}>{Esc(hint)}</div>" : "")}<div style=\"height:6px;line-height:6px;font-size:0\">&nbsp;</div>";

    public string H3(string title) => $"<div {Ts("12px", 700, c.Muted, c.Font, "text-transform:uppercase;letter-spacing:0.08em;padding:6px 0 2px")}>{Esc(title)}</div>";

    /// <summary>Small chart of a figure (attached PNG, shown at half its size).</summary>
    public static string Spark(string cid, int width, int height) =>
        $"<img src=\"cid:{cid}\" width=\"{width / 2}\" height=\"{height / 2}\" alt=\"\" style=\"display:block;width:100%;max-width:{width / 2}px;height:auto;border:0;margin-top:8px\">";

    private static string Width(int columns) => $"{(100.0 / columns).ToString("F2", CultureInfo.InvariantCulture)}%";

    public string Kpi(Figure f, string width) =>
        $"<td class=\"sk-q\" width=\"{width}\" valign=\"top\" style=\"padding:0 4px 8px\"><table {T} class=\"sk-card\" style=\"background:{c.Card};border:1px solid {c.Line};border-radius:12px\"><tr><td style=\"padding:14px 14px 12px;font-family:{c.Font}\"><div {Ts("28px/1.1", 800, c.Ink, c.Display, "letter-spacing:-0.03em", "sk-fig")}>{Esc(f.Value)}</div><div {Ts("12px", 400, c.Muted, c.Font, "margin-top:2px")}>{Esc(f.Label)}</div><div {Ts("11px/1.45", 400, c.Text, c.Font, "margin-top:6px;min-height:14px")}>{f.Sub}</div>{f.Image}</td></tr></table></td>";

    /// <summary>Row of key figures, completed to keep cards of the same width; two by two on a phone.</summary>
    public string KpiRow(IEnumerable<Figure> kpis, int columns = 4)
    {
        var width = Width(columns);
        var cells = kpis.Select(k => Kpi(k, width)).ToList();
        while (cells.Count % columns != 0) cells.Add($"<td class=\"sk-q\" width=\"{width}\"></td>");
        var rows = new List<string>();
        for (var i = 0; i < cells.Count; i += columns) rows.Add($"<tr><td class=\"sk-px\" style=\"padding:0 20px\"><table {T}><tr>{string.Concat(cells.Skip(i).Take(columns))}</tr></table></td></tr>");
        return string.Concat(rows);
    }

    /// <summary>Light row of figures inside a card: no frame, a line of figures (two by two on a phone).</summary>
    public string Figures(IReadOnlyList<Figure> list, int columns = 3)
    {
        var width = Width(columns);
        string Cell(Figure f) =>
            $"<td class=\"sk-q\" width=\"{width}\" valign=\"top\" style=\"padding:4px 12px 8px 0\"><div {Ts("20px/1.2", 800, c.Ink, c.Display, "letter-spacing:-0.02em")}>{Esc(f.Value)}</div><div {Ts("12px/1.4", 400, c.Muted, c.Font, "margin-top:2px")}>{Esc(f.Label)}</div>{(f.Sub.Length > 0 ? $"<div {Ts("11px/1.45", 400, c.Text, c.Font, "margin-top:3px")}>{f.Sub}</div>" : "")}</td>";
        var rows = new List<string>();
        for (var i = 0; i < list.Count; i += columns)
        {
            var part = list.Skip(i).Take(columns).Select(Cell).ToList();
            while (part.Count < columns) part.Add($"<td class=\"sk-q\" width=\"{width}\"></td>");
            rows.Add($"<tr>{string.Concat(part)}</tr>");
        }
        return $"<table {T}>{string.Concat(rows)}</table>";
    }

    /// <summary>Ranking: label and number, proportional bar below.</summary>
    public (string Inner, string Text) List(string title, List<(string Label, double Value)> rows, string hint = "")
    {
        if (rows.Count == 0) return ("", "");
        var max = Math.Max(1, rows.Max(r => r.Value));
        var html = rows.Select(r =>
        {
            var w = (int)Math.Min(100, Math.Max(4, Js.Round(r.Value / max * 100)));
            return $"<tr><td {Ts("13px", 400, c.Text, c.Font, "padding-top:7px")}>{Esc(r.Label)}</td><td align=\"right\" {Ts("13px", 700, c.Ink, c.Font, "padding-top:7px;padding-left:8px")}>{Esc(Format.Number(texts, r.Value))}</td></tr><tr><td colspan=\"2\" style=\"padding-top:3px\"><table {T} style=\"font-size:0;line-height:0\"><tr><td width=\"{w}%\" height=\"6\" bgcolor=\"{c.Accent}\" style=\"border-radius:3px\">&nbsp;</td>{(w < 100 ? "<td>&nbsp;</td>" : "")}</tr></table></td></tr>";
        });
        return ($"{H2(title, hint)}<table {T}>{string.Concat(html)}</table>",
            $"\n{Format.Upper(title)}\n{string.Join("\n", rows.Select(r => $"  - {Format.LabelValue(texts, r.Label, Format.Number(texts, r.Value))}"))}\n");
    }

    /// <summary>Table with a label column and number columns (HTML already escaped in the cells).</summary>
    public string Grid(IReadOnlyList<string> head, IEnumerable<IReadOnlyList<string>> rows)
    {
        var th = string.Concat(head.Select((h, i) => $"<td{(i > 0 ? " align=\"right\"" : "")} {Ts("11px", 700, c.Muted, c.Font, $"padding:0 {(i > 0 ? "0 4px 8px" : "0 4px 0")}")}>{Esc(h)}</td>"));
        var tr = string.Concat(rows.Select(r => $"<tr>{string.Concat(r.Select((x, i) => $"<td{(i > 0 ? " align=\"right\"" : "")} {Ts("13px/1.4", i > 0 ? 700 : 400, i > 0 ? c.Ink : c.Text, c.Font, $"padding:6px {(i > 0 ? "0 0 8px" : "0 0 0")};border-top:1px solid {c.Line}", "sk-bd")}>{x}</td>"))}</tr>"));
        return $"<table {T}><tr>{th}</tr>{tr}</table>";
    }

    /// <summary>Lines with a change at the right ("+12" in green, "-3" in red); <c>Tag</c>: small grey word after the label.</summary>
    public string Moves(IEnumerable<MoveRow> rows) =>
        $"<table {T}>{string.Concat(rows.Select(r =>
        {
            var color = r.Tone == "up" ? c.Up : r.Tone == "down" ? c.Down : c.Muted;
            return $"<tr><td {Ts("13px/1.4", 400, c.Text, c.Font, $"padding:6px 0;border-top:1px solid {c.Line}", "sk-bd")}>{Esc(r.Label)}{(r.Tag.Length > 0 ? $" <span {Ts("11px", 400, c.Muted)}>· {Esc(r.Tag)}</span>" : "")}</td><td align=\"right\" valign=\"top\" {Ts("13px/1.4", 700, color, c.Font, $"padding:6px 0 6px 8px;border-top:1px solid {c.Line};white-space:nowrap", "sk-bd")}>{Esc(r.Text)}</td></tr>";
        }))}</table>";

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
        // sk-b1 / sk-b0: bars of the period and of the previous period, lighter in dark mode
        string Bar(double v, string color, string cls) => $"<td valign=\"bottom\" style=\"padding:0\"><table {T} style=\"font-size:0;line-height:0\"><tr><td class=\"{cls}\" height=\"{(int)Math.Max(2, Js.Round(v / max * H))}\" bgcolor=\"{color}\" style=\"border-radius:3px 3px 0 0\">&nbsp;</td></tr></table></td>";
        var cells = values.Select((v, i) => $"<td valign=\"bottom\" style=\"padding:0 1px\" title=\"{Esc(titles[i])}\"><table {T}><tr>{(prev is not null ? Bar(prev[i], ghost, "sk-b0") : "")}{Bar(v, c.AccentDeep, "sk-b1")}</tr></table></td>");
        // legend: one line per series, the swatch kept square whatever the width
        string Item(string color, string cls, string text) => $"<tr><td width=\"10\" style=\"padding:3px 0\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:0;line-height:0\"><tr><td class=\"{cls}\" width=\"10\" height=\"10\" bgcolor=\"{color}\">&nbsp;</td></tr></table></td><td {Ts("11px/1.3", 400, c.Muted, c.Font, "padding:3px 0 3px 6px")}>{Esc(text)}</td></tr>";
        var key = prev is not null && legend is { } l
            ? $"<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-top:6px\">{Item(c.AccentDeep, "sk-b1", l.Current)}{Item(ghost, "sk-b0", l.Previous)}</table>"
            : "";
        return $"<table {T} height=\"{H}\"><tr>{string.Concat(cells)}</tr></table><table {T} style=\"margin-top:6px\"><tr><td {Ts("11px", 400, c.Muted)}>{Esc(first)}</td><td align=\"right\" {Ts("11px", 400, c.Muted)}>{Esc(last)}</td></tr></table>{key}";
    }

    /// <summary>Bulleted lines (already formatted texts).</summary>
    public string Bullets(IEnumerable<string> lines) =>
        $"<table {T}>{string.Concat(lines.Select(l => $"<tr><td width=\"14\" valign=\"top\" {Ts("13px", 400, c.AccentDeep, c.Font, "padding:4px 0")}>●</td><td {Ts("13px/1.5", 400, c.Text, c.Font, "padding:4px 0")}>{Esc(l)}</td></tr>"))}</table>";

    /// <summary>7 × 24 heatmap; <paramref name="days"/> are the short weekday names, Monday first.</summary>
    public string Heat(IReadOnlyList<IReadOnlyList<double>> grid, IReadOnlyList<string> days)
    {
        var max = Math.Max(1, grid.SelectMany(r => r).DefaultIfEmpty(0).Max());
        var head = $"<tr><td width=\"4%\"></td>{string.Concat(Enumerable.Range(0, 24).Select(h => $"<td width=\"4%\" align=\"center\" {Ts("9px/1.4", 400, c.Muted)}>{(h % 3 == 0 ? Esc(Format.Number(texts, h)) : "")}</td>"))}</tr>";
        // the cells are only coloured (the heatmap has 168 of them): gaps from the table spacing, height on the row; an empty
        // cell (sk-he) stays a little lighter than the card in dark mode, so that the grid reads
        var rows = grid.Select((r, d) => $"<tr style=\"height:15px\"><td {Ts("10px", 400, c.Muted, c.Font, "padding-right:4px;line-height:1")}>{Esc(days[d])}</td>{string.Concat(r.Select(y => y != 0
            ? $"<td bgcolor=\"{Format.MixHex(c.Soft, c.AccentDeep, 0.15 + 0.85 * (y / max))}\">&nbsp;</td>"
            : $"<td class=\"sk-he\" bgcolor=\"{c.Page}\">&nbsp;</td>"))}</tr>");
        return $"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"2\" border=\"0\" style=\"font-size:0;line-height:0\">{head}{string.Concat(rows)}</table>";
    }

    public string Button(string href, string label) =>
        $"<tr><td align=\"center\" style=\"padding:8px 24px 8px\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td bgcolor=\"{c.AccentDeep}\" style=\"background:{c.AccentDeep};border-radius:999px\"><a href=\"{Esc(href)}\" style=\"display:inline-block;padding:13px 26px;font:700 14px {c.Font};color:#ffffff;text-decoration:none\">{Esc(label)}</a></td></tr></table></td></tr>";

    public string Header(string eyebrow, string title, string subtitle, string logo) =>
        $"<tr><td class=\"sk-px\" style=\"padding:0 24px 16px 24px\"><table {T} bgcolor=\"{c.Head}\" style=\"background:{c.Head};border-radius:16px\"><tr><td class=\"sk-in\" style=\"padding:26px 28px\">{(logo.Length > 0 ? $"<div style=\"margin-bottom:14px\">{logo}</div>" : "")}<div style=\"font:700 12px {c.Font};color:{c.Eyebrow};letter-spacing:0.14em;text-transform:uppercase\">{Esc(eyebrow)}</div><div class=\"sk-h1\" style=\"font:800 26px/1.2 {c.Display};color:{c.HeadText};margin-top:8px;letter-spacing:-0.02em\">{Esc(title)}</div><div style=\"font:400 14px/1.45 {c.Font};color:{c.HeadMuted};margin-top:6px\">{Esc(subtitle)}</div></td></tr></table></td></tr>";

    /// <summary>Sentence that sums up the period, large, under the header.</summary>
    public string Headline(string text) =>
        $"<tr><td class=\"sk-px\" style=\"padding:0 24px 16px\"><table {T} class=\"sk-soft\" bgcolor=\"{c.Soft}\" style=\"background:{c.Soft};border-radius:12px\"><tr><td style=\"padding:14px 18px;border-left:4px solid {c.AccentDeep};border-radius:12px;font-family:{c.Font}\"><div {Ts("17px/1.45", 700, c.Ink, c.Display)}>{Esc(text)}</div></td></tr></table></td></tr>";

    public string Note(string text) => $"<tr><td class=\"sk-px\" {Ts("13px/1.5", 400, c.Muted, c.Font, $"padding:0 24px 16px;font-family:{c.Font}")}>{Esc(text)}</td></tr>";
    /// <summary>Highlighted site data (requests to handle…), in amber: <c>sk-warn</c> / <c>sk-wi</c> in dark mode.</summary>
    public string Callout(string html) => $"<tr><td class=\"sk-px\" style=\"padding:0 24px 16px\"><table {T} class=\"sk-warn\" bgcolor=\"{c.WarnSoft}\" style=\"background:{c.WarnSoft};border-radius:12px\"><tr><td {Ts("14px/1.5", 400, c.WarnInk, c.Font, $"padding:14px 16px;font-family:{c.Font}", "sk-wi")}>{html}</td></tr></table></td></tr>";
    public string Paragraph(string text) => $"<tr><td class=\"sk-px\" {Ts("15px/1.6", 400, c.Ink, c.Font, $"padding:0 24px 16px;font-family:{c.Font}")}>{EscLines(text)}</td></tr>";
    public string Footer(string text) => $"<tr><td align=\"center\" class=\"sk-px\" {Ts("12px/1.6", 400, c.Muted, c.Font, $"padding:14px 24px 0;font-family:{c.Font}")}>{EscLines(text)}</td></tr>";

    /// <summary>Link to a page of the administration, at the end of a block.</summary>
    public string Link(string url, string label) => $"<div style=\"font:12px {c.Font};margin-top:10px\"><a href=\"{Esc(url)}\" class=\"sk-ac\" style=\"color:{c.AccentDeep}\">{Esc(label)}</a></div>";

    /// <summary>Style sheet: phone layout and dark mode (clients that read it; the others keep the inline styles).</summary>
    private string Css()
    {
        var d = c.Dark;
        var ghost = Format.MixHex(d.Line, d.Muted, 0.4);
        var empty = Format.MixHex(d.Card, "#ffffff", 0.08);
        var dark = $".sk-bg{{background:{d.Page}!important;background-color:{d.Page}!important}}.sk-card{{background:{d.Card}!important;background-color:{d.Card}!important;border-color:{d.Line}!important}}.sk-soft{{background:{d.Soft}!important;background-color:{d.Soft}!important}}.sk-ink{{color:{d.Ink}!important}}.sk-tx{{color:{d.Text}!important}}.sk-mu{{color:{d.Muted}!important}}.sk-ac{{color:{d.Accent}!important}}.sk-up{{color:{d.Up}!important}}.sk-dn{{color:{d.Down}!important}}.sk-bd{{border-color:{d.Line}!important}}.sk-he{{background:{empty}!important;background-color:{empty}!important}}.sk-warn{{background:#3a2f16!important;background-color:#3a2f16!important}}.sk-wi{{color:#ffd98c!important}}.sk-b1{{background:{d.Accent}!important;background-color:{d.Accent}!important}}.sk-b0{{background:{ghost}!important;background-color:{ghost}!important}}";
        var ogsc = dark.Replace(".sk-", "[data-ogsc] .sk-", StringComparison.Ordinal);
        return $"<style>:root{{color-scheme:light dark;supported-color-schemes:light dark}}@media only screen and (max-width:600px){{.sk-px{{padding-left:10px!important;padding-right:10px!important}}.sk-in{{padding:14px!important}}.sk-q{{display:inline-block!important;width:50%!important;box-sizing:border-box}}.sk-col{{display:block!important;width:100%!important;box-sizing:border-box;padding:0 0 12px 0!important}}.sk-pr{{padding-bottom:4px!important}}.sk-h1{{font-size:22px!important}}.sk-fig{{font-size:24px!important}}}}@media (prefers-color-scheme:dark){{{dark}}}{ogsc}</style>";
    }

    /// <summary>Complete document: <paramref name="rows"/> = &lt;tr&gt; rows already assembled.</summary>
    public string Page(string title, string preheader, string rows) =>
        $"<!doctype html><html lang=\"{Esc(texts.Locale)}\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"color-scheme\" content=\"light dark\"><meta name=\"supported-color-schemes\" content=\"light dark\"><meta name=\"x-apple-disable-message-reformatting\"><title>{Esc(title)}</title>\n"
        + $"{Css()}\n"
        + "<!--[if mso]><style>table{border-collapse:collapse}td{font-family:Arial,sans-serif}</style><![endif]--></head>\n"
        + $"<body class=\"sk-bg\" style=\"margin:0;padding:0;background:{c.Page};-webkit-text-size-adjust:100%\"><div style=\"display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:{c.Page}\">{Esc(preheader)}{string.Concat(Enumerable.Repeat("&#8199;&#65279;&#847; ", 40))}</div>\n"
        + $"<table {T} class=\"sk-bg\" bgcolor=\"{c.Page}\" style=\"background:{c.Page}\"><tr><td align=\"center\" style=\"padding:24px 8px\">\n"
        + $"<!--[if mso]><table role=\"presentation\" width=\"{MailWidth}\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td><![endif]-->\n"
        + $"<table role=\"presentation\" width=\"{MailWidth}\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;max-width:{MailWidth}px\">\n"
        + $"{rows}\n"
        + "</table>\n"
        + "<!--[if mso]></td></tr></table><![endif]-->\n"
        + "</td></tr></table></body></html>";
}
