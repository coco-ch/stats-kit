using System.Text.Json.Nodes;
using StatsKit;

namespace StatsKit.Tests;

/// <summary>Formats rebuilt from the Intl snapshot: the same strings as Intl in Node (Golden/formats.json).</summary>
public class FormatTests
{
    private static readonly JsonObject Data = Golden.Load("formats");

    public static TheoryData<string> Tags() => [.. ((JsonObject)Data["formats"]!).Select(p => p.Key)];

    private static void Each(JsonNode? list, Action<JsonArray> check)
    {
        foreach (var row in (JsonArray)list!) check((JsonArray)row!);
    }

    [Theory]
    [MemberData(nameof(Tags))]
    public void Same_strings_as_Intl(string tag)
    {
        var f = (JsonObject)Data["formats"]![tag]!;
        var t = Texts.Create(tag);
        Assert.Equal((string)f["locale"]!, t.Locale);
        var errors = new List<string>();
        void Eq(string what, string? expected, string actual) { if (expected != actual) errors.Add($"{what}: expected «{expected}», got «{actual}»"); }

        Each(f["number"], r => Eq($"number({r[0]}, {r[1]}, {r[2]})", (string)r[3]!, Format.Number(t, (double)r[0]!, (int)r[1]!, (bool)r[2]!)));
        Each(f["percent"], r => Eq($"percent({r[0]}, {r[1]}, {r[2]})", (string)r[3]!, Format.Percent(t, (double)r[0]!, (int)r[1]!, (bool)r[2]!)));
        Each(f["duration"], r => Eq($"duration({r[0]})", (string)r[1]!, Format.Duration(t, (double)r[0]!)));
        Each(f["dm"], r => Eq($"shortDate({r[0]})", (string)r[1]!, Format.ShortDate(t, (string)r[0]!)));
        Each(f["dmy"], r => Eq($"shortDate({r[0]}, year)", (string)r[1]!, Format.ShortDate(t, (string)r[0]!, "UTC", true)));
        Each(f["instants"], r =>
        {
            Eq($"shortDate({r[0]}, Paris)", (string)r[1]!, Format.ShortDate(t, (string)r[0]!, "Europe/Paris"));
            Eq($"shortDate({r[0]}, New York)", (string)r[2]!, Format.ShortDate(t, (string)r[0]!, "America/New_York", true));
        });
        Each(f["longDay"], r => Eq($"longDay({r[0]})", (string)r[1]!, Format.LongDay(t, (string)r[0]!)));
        Each(f["slotLong"], r => Eq($"slotLabel({r[0]}, long)", (string)r[1]!, Format.SlotLabel(t, (string)r[0]!, "day", true)));
        var hours = (JsonArray)f["hours"]!;
        for (var h = 0; h < 24; h++) Eq($"hour({h})", (string)hours[h]!, Format.HourName(t, h));
        var weekdays = (JsonArray)f["weekdays"]!;
        for (var d = 0; d < 7; d++)
        {
            Eq($"weekday({d})", (string)weekdays[d]![0]!, Format.WeekdayName(t, d));
            Eq($"weekday({d}, short)", (string)weekdays[d]![1]!, Format.WeekdayName(t, d, true));
        }
        // names follow the language: a regional tag outside the snapshot keeps the names of its language
        if (!tag.Contains('-') || Texts.Languages.Select(l => Texts.Create(l).Locale).Contains(tag))
        {
            Each(f["countries"], r => Eq($"country({r[0]})", (string)r[1]!, Format.CountryName(t, (string)r[0]!)));
            Each(f["languages"], r => Eq($"language({r[0]})", (string)r[1]!, Format.LanguageName(t, (string)r[0]!)));
        }
        Each(f["upper"], r => Eq($"upper({r[0]})", (string)r[1]!, Format.Upper((string)r[0]!)));
        Assert.True(errors.Count == 0, $"{errors.Count} differences:\n" + string.Join("\n", errors.Take(40)));
    }

    [Fact]
    public void Same_order_as_localeCompare()
    {
        var sorted = ((JsonArray)Data["sorted"]!).Select(x => (string)x!).ToList();
        var shuffled = sorted.OrderBy(s => s.GetHashCode()).ToList();
        Assert.Equal(sorted, shuffled.OrderBy(s => s, Collation.Comparer).ToList());
    }
}
