using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;

namespace StatsKit;

/// <summary>
/// Order of <c>localeCompare</c> (ICU root collation), used to rank rows of equal value the way the Node server does: the
/// characters first (punctuation, then digits, then letters, accents and case ignored), then the accents, then the case
/// (lower case first). Printable ASCII ranks come from the Intl snapshot; other characters are ranked after their base letter.
/// </summary>
internal sealed class Collation : IComparer<string>
{
    public static readonly Collation Comparer = new();

    private static readonly Lazy<int[]> Ranks = new(() =>
    {
        var c = (JsonObject)JsonNode.Parse(Texts.Resource("StatsKit.intl.json"))!["collation"]!;
        var order = (string)c["order"]!;
        var ranks = ((string)c["ranks"]!).Split(',').Select(int.Parse).ToArray();
        var table = new int[128];
        Array.Fill(table, -1);
        for (var i = 0; i < order.Length; i++) table[order[i]] = ranks[i];
        return table;
    });

    private static (int Primary, int Accent, int Case) Weight(string s, ref int i)
    {
        var c = s[i++];
        var table = Ranks.Value;
        if (c < 128 && table[c] >= 0) return (table[c], 0, char.IsAsciiLetterUpper(c) ? 1 : 0);
        var decomposed = c.ToString().Normalize(NormalizationForm.FormD);
        var baseChar = decomposed[0];
        var accent = decomposed.Length > 1 ? decomposed[1] : 0;
        while (i < s.Length && CharUnicodeInfo.GetUnicodeCategory(s[i]) == UnicodeCategory.NonSpacingMark) accent = accent * 31 + s[i++];
        if (baseChar < 128 && table[baseChar] >= 0) return (table[baseChar], accent, char.IsAsciiLetterUpper(baseChar) ? 1 : 0);
        var lower = char.ToLowerInvariant(baseChar);
        return (1000 + lower, accent, lower != baseChar ? 1 : 0);
    }

    private static List<(int Primary, int Accent, int Case)> Weights(string s)
    {
        var list = new List<(int, int, int)>(s.Length);
        for (var i = 0; i < s.Length;) list.Add(Weight(s, ref i));
        return list;
    }

    public int Compare(string? x, string? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        if (x is null) return -1;
        if (y is null) return 1;
        var a = Weights(x);
        var b = Weights(y);
        foreach (var level in new Func<(int Primary, int Accent, int Case), int>[] { w => w.Primary, w => w.Accent, w => w.Case })
        {
            for (var i = 0; i < Math.Min(a.Count, b.Count); i++)
            {
                var d = level(a[i]).CompareTo(level(b[i]));
                if (d != 0) return d;
            }
            if (a.Count != b.Count) return a.Count.CompareTo(b.Count);
        }
        return string.CompareOrdinal(x, y);
    }
}
