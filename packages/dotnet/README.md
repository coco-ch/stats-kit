# StatsKit.Server

Website traffic statistics for a site's administration, for ASP.NET Core: the .NET server of [stats-kit](https://github.com/stats-kit/stats-kit).

- **Umami** connector (API v2 and v3, self-hosted with a read-only service account, or Umami Cloud with an API key), in-memory cache.
- Overview of a period compared with the previous period: totals, series aligned day by day or hour by hour, last 24 hours, day × hour heatmap, pages with entries and exits, sources, channels, countries, regions, cities, languages, devices, browsers, systems, screens, events, UTM, goals, latest sessions, live count.
- **E-mail report** in Outlook-compatible HTML (760 px, tables and inline styles): a sentence that sums up the period, a subject with the figures, key figures with their change and a small PNG chart each, rising and falling pages and sources, a **PNG world map** drawn on the server and attached as `cid:`, an "At a glance" card, page views per day next to the previous period, the heatmap, Google and YouTube blocks (figures given by the site), rankings, site data and site-specific cards (amounts with `Format.Money`), two by two on a phone and in dark colours in the clients that apply them, plus a plain-text version; its **preview** with the images included; weekly sending as a hosted service (once per ISO week).
- **Eleven languages**: English, French, German, Spanish, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, Korean; any text can be overridden. Formats (numbers, dates, units, country and language names) come with the package and do not depend on the globalization data of the machine.
- The **same routes and the same JSON** as the Node server of stats-kit, for its Angular components (`<sk-statistics>`…): `GET /overview`, `/live`, `/report/preview`, `/world.json`, `/search`, `/search/indexation`, `/youtube`, `POST /report/send`. Contract tests check that both servers give the same answers on the same data.
- No dependency beyond the ASP.NET Core shared framework. .NET 10 or later.

```csharp
using StatsKit;

builder.Services.AddStatsKit((sp, o) =>
{
    o.SiteName = "My site";
    o.Locale = "en";
    o.TimeZone = "Europe/Paris";
    o.Umami = UmamiOptions.FromValues(key => builder.Configuration[key]); // UMAMI_API_URL, UMAMI_WEBSITE_ID, UMAMI_USERNAME, UMAMI_PASSWORD
    o.Report.Theme = new ReportTheme { Brand = "#1d3c9c" };
    o.Report.Send = (message, ct) => MySendAsync(message, ct); // the site sends; returns the number of recipients
});

app.MapStatsKit("/api/admin/audience").RequireAuthorization("admin");
```

The routes expose audience data: protect them. Avoid "analytics", "stats" or "track" in the address, which ad blockers block.

Search Console and YouTube are connected by the Node server only for now; here their routes answer "not configured". Their blocks of the report are drawn from the figures the site gives with `o.Report.Sources`. The site's business figures (requests to handle, customers, subscriptions, service status…) go at the top of the report with `o.Report.Business = (overview, ct) => Task.FromResult<ReportBusiness?>(new([new BusinessKpi("requests", "Requests received", 5, Previous: 2)]))`.

Documentation, Angular components and data contract: <https://github.com/stats-kit/stats-kit>. Licence: MIT. Base map: Natural Earth (public domain).
