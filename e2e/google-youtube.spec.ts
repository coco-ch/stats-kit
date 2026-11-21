import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './helpers.ts';

test.describe('Google page', () => {
  test('every section, brand scope, indexing', async ({ page }) => {
    await ready(page, '/#google');
    await expect(page.getByRole('heading', { level: 1, name: 'Google' })).toBeVisible();
    for (const name of ['Impressions in Google per day', 'Clicks from Google per day', 'Queries × pages', 'High-potential queries', 'Rising queries', 'Queries with several pages', 'Search appearance', 'Sitemaps']) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Brand', exact: true }).click();
    const queries = page.locator('#sk-queries sk-metric-table').first();
    await expect(queries.locator('tbody tr').first()).toContainText('example');
    await page.getByRole('button', { name: 'Check indexing' }).click();
    await expect(page.getByText(/of 9 pages indexed/)).toBeVisible();
    await noHorizontalScroll(page);
  });
  test('accessibility AA', async ({ page }) => {
    await ready(page, '/?theme=dark#google');
    expect(await axe(page)).toEqual([]);
  });
  test('in Spanish', async ({ page }) => {
    await ready(page, '/?lang=es#google');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Consultas', exact: true })).toBeVisible();
  });
});

test.describe('YouTube page', () => {
  test('channel, site side, videos', async ({ page }) => {
    await ready(page, '/#youtube');
    await expect(page.getByRole('heading', { name: 'Example Workshop' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open YouTube Studio' })).toHaveAttribute('href', /studio\.youtube\.com/);
    for (const name of ['Landing pages', 'Views per day', 'Minutes watched per day', 'Where views come from']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Assembling a walnut chair' })).toBeVisible();
    await page.getByRole('button', { name: '90 days' }).click();
    await expect(page.getByText(/\d+ \/ day/).first()).toBeVisible();
  });
  test('accessibility AA', async ({ page }) => {
    await ready(page, '/?theme=light#youtube');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('without any source connected', () => {
  test.use({ baseURL: 'http://127.0.0.1:5318' });
  test('each page says what is missing, the site data stays', async ({ page }) => {
    await ready(page);
    await expect(page.getByText('Visit statistics are not connected')).toBeVisible();
    await expect(page.getByText('Requests received').first()).toBeVisible();
    await ready(page, '/#google');
    await expect(page.getByText('Search Console is not connected')).toBeVisible();
    await ready(page, '/#youtube');
    await expect(page.getByText('YouTube channel is not connected')).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});
