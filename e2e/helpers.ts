import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** Accessibility audit (WCAG 2.1 AA) of the visible component; returns the violations. */
export async function axe(page: Page, selector = 'main') {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (sel) => {
    const w = window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } };
    const r = await w.axe.run({ include: [sel] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }, selector);
}

/** Page loaded: no loading indicator left (whatever the language). */
export async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('main [role=status].sk-empty')).toHaveCount(0);
  await expect(page.locator('main h1')).toBeVisible();
}

/** No horizontal scrolling of the page. */
export const noHorizontalScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
