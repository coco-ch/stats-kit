import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './helpers.ts';

test.describe('Statistics page', () => {
  test('every section, on fake data', async ({ page }) => {
    await ready(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Statistics' })).toBeVisible();
    for (const name of ['Page views and visitors per day', 'What visitors do', 'Where visits come from', 'Last 24 hours', 'When do they come?', 'Most viewed pages', 'Most viewed product pages', 'Acquisition channels', 'Browsers', 'Visitor actions', 'Requests received by subject', 'Latest sessions']) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/\d+ active visitors?/)).toBeVisible();
    await expect(page.locator('sk-world-map path.sk-map__on').first()).toBeVisible();
    await expect(page.locator('sk-world-map path.sk-map__on')).toHaveCount(15);
    await expect(page.getByRole('row', { name: /France/ }).first()).toBeVisible();
    await expect(page.locator('sk-heatmap .sk-heat__cell')).toHaveCount(168);
    await expect(page.locator('sk-trend-chart rect.sk-bar').first()).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('the site global styles break nothing (svg, .bar, .card…)', async ({ page }) => {
    await ready(page);
    const box = await page.locator('sk-trend-chart svg').first().boundingBox();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(150);
    const map = await page.locator('sk-world-map svg').boundingBox();
    expect(map!.width).toBeGreaterThan(300);
    await expect(page.locator('sk-trend-chart rect.sk-bar').first()).toBeVisible();
    expect(await page.locator('sk-statistics [class*="card"]').first().evaluate((e) => getComputedStyle(e).borderStyle)).not.toBe('dashed');
  });

  test('periods: 24 hours, 7 days, chosen dates', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: '24 h' }).click();
    await expect(page.getByRole('heading', { name: 'Page views and visitors per hour' })).toBeVisible();
    await expect(page.getByText(/· last 24 hours$/)).toBeVisible();
    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page.getByText(/\(7 days\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByLabel('From', { exact: true }).fill('2026-11-01');
    await page.getByLabel('to', { exact: true }).fill('2026-11-10');
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await expect(page.getByText(/1 Nov to 10 Nov \(10 days\)/)).toBeVisible();
  });

  test('tables: sort, filter, expand, CSV export', async ({ page }) => {
    await ready(page);
    const table = page.locator('sk-metric-table').filter({ has: page.getByRole('heading', { name: 'Most viewed pages' }) });
    await expect(table.locator('tbody tr')).toHaveCount(12);
    await table.getByRole('button', { name: /Show all \d+ rows/ }).click();
    await expect(table.locator('tbody tr')).toHaveCount(14);
    await table.getByRole('searchbox').fill('contact');
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await table.getByRole('searchbox').fill('');
    await table.getByRole('button', { name: 'Time' }).click();
    await expect(table.locator('th[aria-sort=descending]')).toHaveText(/Time/);
    const download = page.waitForEvent('download');
    await table.getByRole('button', { name: 'Export as CSV: Most viewed pages' }).click();
    expect((await download).suggestedFilename()).toBe('most-viewed-pages.csv');
    const all = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export (CSV)' }).click();
    expect((await all).suggestedFilename()).toMatch(/^statistics-30-days-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('report: preview in a new tab, sending handed to the site', async ({ page, context, request }) => {
    await ready(page);
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Preview report' }).click();
    const tab = await popup;
    await expect(tab.getByText('Site traffic')).toBeVisible();
    await expect(tab.locator('img[alt="World map of visits by country"]')).toBeVisible();
    expect(await tab.locator('img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(600);
    const before = (await (await request.get('/api/demo/outbox')).json()).length;
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByText('Report sent to 2 recipients.')).toBeVisible();
    const outbox = await (await request.get('/api/demo/outbox')).json();
    expect(outbox.length).toBe(before + 1);
    expect(outbox.at(-1).attachments).toBe(1);
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: 'Send report' }).click();
    expect((await (await request.get('/api/demo/outbox')).json()).length).toBe(before + 1);
  });

  test('map: tooltip and zoom', async ({ page }) => {
    await ready(page);
    const svg = page.locator('sk-world-map svg');
    const before = await svg.getAttribute('viewBox');
    await page.locator('sk-world-map').getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(svg).not.toHaveAttribute('viewBox', before!); // retried: the view is redrawn after the click
    await page.locator('sk-world-map').getByRole('button', { name: 'Reset view' }).click();
    await expect(svg).toHaveAttribute('viewBox', before!);
    await page.locator('sk-world-map path.sk-map__on').first().hover();
    await expect(page.locator('.sk-map__tip')).toContainText('visits');
  });

  test('keyboard: sections and sorting are reachable', async ({ page }) => {
    await ready(page);
    await page.getByRole('link', { name: 'Sources', exact: true }).click();
    await expect(page.locator('#sk-sources')).toBeFocused();
    const sortButton = page.locator('sk-metric-table').filter({ hasText: 'Acquisition channels' }).getByRole('button', { name: 'Visits' });
    await sortButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('sk-metric-table').filter({ hasText: 'Acquisition channels' }).locator('th[aria-sort=ascending]')).toHaveCount(1);
  });

  test('accessibility AA, light theme', async ({ page }) => {
    await ready(page, '/?theme=light');
    expect(await axe(page)).toEqual([]);
  });

  test('accessibility AA, dark theme', async ({ page }) => {
    await ready(page, '/?theme=dark');
    await expect(page.locator('sk-statistics')).toHaveAttribute('data-sk-mode', 'dark');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('languages', () => {
  test('French: texts, French number format and weekday names', async ({ page }) => {
    await ready(page, '/?lang=fr');
    await expect(page.getByRole('heading', { level: 1, name: 'Statistiques' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'D’où viennent les visites' })).toBeVisible();
    await expect(page.getByText(/visiteurs? actifs?/)).toBeVisible();
    await expect(page.locator('sk-tile').filter({ has: page.locator('.sk-tile__label', { hasText: /^Pages vues$/ }) }).locator('.sk-tile__value')).toHaveText(/^\d{1,3}[  ]\d{3}$/);
    await expect(page.getByText(/Créneau le plus actif : (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) à \d\d:00/).first()).toBeVisible();
  });

  test('German: texts and German number format', async ({ page }) => {
    await ready(page, '/?lang=de');
    await expect(page.getByRole('heading', { level: 1, name: 'Statistiken' })).toBeVisible();
    await expect(page.locator('sk-tile').first().locator('.sk-tile__value')).toHaveText(/^\d{1,3}\.\d{3}$/);
  });

  test('switching language from the demo menu changes every page', async ({ page }) => {
    await ready(page);
    for (const [lang, title] of [['it', 'Statistiche'], ['pt', 'Estatísticas'], ['nl', 'Statistieken'], ['es', 'Estadísticas']]) {
      await page.locator('header').getByLabel('Language').selectOption(lang);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
  });

  test('accessibility AA in French and German', async ({ page }) => {
    for (const lang of ['fr', 'de']) {
      await ready(page, `/?lang=${lang}`);
      expect(await axe(page)).toEqual([]);
    }
  });
});
