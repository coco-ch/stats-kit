import { type Browser, type TestInfo, expect, test } from '@playwright/test';
import { ready } from './helpers.ts';
import { checkLayout, enlargeText, line } from './layout.ts';

/*
 * Layout of the three pages, as a host administration shows them: no horizontal scrolling, nothing out of the window or of its
 * card, no overlap, no cut text, 48 × 48 px tap targets at phone widths. Every page in a wide font, at the usual widths in both
 * themes, then with the text enlarged to 200 % (text size setting of a phone, or of the browser on a computer) at 320, 375, 1024
 * and 1366 px, in English and in German (longest words), and inside a host with a side menu sized in rem (it grows with the text, as
 * in most administrations: the page gets narrow in a wide window).
 */
const PAGES = [{ name: 'statistics', hash: '' }, { name: 'google', hash: '#google' }, { name: 'youtube', hash: '#youtube' }];
const WIDTHS = [320, 375, 412, 768, 1024, 1366, 1440, 1920];
const ENLARGED = [320, 375, 1024, 1366];
/** Side menu of the host, in rem: 20 rem, 640 px with the text at 200 %. */
const SIDE_MENU = 'main { margin-left: 20rem !important; }';
/** Wide font (Verdana on Windows and macOS, DejaVu Sans on Linux): words at least as long as with the default fonts of any system. */
const WIDE_FONT = 'Verdana, "DejaVu Sans", sans-serif';

async function run(browser: Browser, info: TestInfo, o: { page: string; hash: string; theme: 'light' | 'dark'; widths: number[]; enlarged?: boolean; lang?: string; aside?: boolean }): Promise<string[]> {
  const ctx = await browser.newContext({ viewport: { width: o.widths[0]!, height: 900 }, colorScheme: o.theme, reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'Europe/Paris' });
  const p = await ctx.newPage();
  await enlargeText(p, o.enlarged ? 2 : 1, WIDE_FONT);
  if (o.aside) await p.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: css }))), SIDE_MENU);
  const lines: string[] = [];
  try {
    await ready(p, `/?theme=${o.theme}${o.lang ? `&lang=${o.lang}` : ''}${o.hash}`);
    for (const w of o.widths) {
      await p.setViewportSize({ width: w, height: 900 });
      const context = `${o.page} · ${o.theme}${o.lang ? ` · ${o.lang}` : ''} · ${w} px${o.enlarged ? ' · text 200 %' : ''}${o.aside ? ' · side menu' : ''}`;
      const defects = await checkLayout(p);
      lines.push(...defects.map((d) => line(context, d)));
      if (defects.length) await info.attach(context, { body: await p.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  } finally {
    await ctx.close();
  }
  return lines;
}

test.describe('layout', () => {
  test.describe.configure({ timeout: 240_000 });
  for (const { name, hash } of PAGES) {
    test(`${name}: every width, both themes`, async ({ browser }, info) => {
      const lines = [...await run(browser, info, { page: name, hash, theme: 'light', widths: WIDTHS }), ...await run(browser, info, { page: name, hash, theme: 'dark', widths: WIDTHS })];
      expect(lines, lines.join('\n')).toEqual([]);
    });
    test(`${name}: text enlarged to 200 % from 320 to 1366 px, both themes, English and German`, async ({ browser }, info) => {
      const lines: string[] = [];
      for (const theme of ['light', 'dark'] as const) for (const lang of [undefined, 'de']) lines.push(...await run(browser, info, { page: name, hash, theme, widths: ENLARGED, enlarged: true, lang }));
      expect(lines, lines.join('\n')).toEqual([]);
    });
    test(`${name}: inside a host with a side menu, normal and enlarged text`, async ({ browser }, info) => {
      const lines = [
        ...await run(browser, info, { page: name, hash, theme: 'light', widths: [1024, 1366, 1920], aside: true }),
        ...await run(browser, info, { page: name, hash, theme: 'light', widths: [1024, 1366, 1920], aside: true, enlarged: true }),
        ...await run(browser, info, { page: name, hash, theme: 'dark', widths: [1024], aside: true, enlarged: true, lang: 'de' }),
      ];
      expect(lines, lines.join('\n')).toEqual([]);
    });
  }
});
