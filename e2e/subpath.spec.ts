import { expect, test, type Page } from '@playwright/test';
import { axe, ready } from './helpers.ts';

// Demo served under a sub-path (DEMO_BASE=/console/, port 5319), as an administration behind a reverse proxy: the base map
// must be found under the address of the page's source, not at the root nor at the address of provideStatsKit.
const ROOT = 'http://127.0.0.1:5319/console/';

/** Paths of the base maps requested by the page. */
const worldRequests = (page: Page) => {
  const seen: string[] = [];
  page.on('request', (r) => { if (r.url().endsWith('/world.json')) seen.push(new URL(r.url()).pathname); });
  return seen;
};

test.describe('served under a sub-path', () => {
  test('the world map has its countries', async ({ page }) => {
    const worlds = worldRequests(page);
    await ready(page, ROOT);
    await expect(page.locator('sk-world-map path.sk-map__land').first()).toBeAttached();
    expect(await page.locator('sk-world-map path.sk-map__land').count()).toBeGreaterThan(100);
    await expect(page.locator('sk-world-map path.sk-map__on')).toHaveCount(15);
    expect(worlds).toEqual(['/console/api/admin/audience/world.json']);
  });

  test('another site: the page reloads its data and its map from the new address, without being recreated', async ({ page }) => {
    const worlds = worldRequests(page);
    await ready(page, ROOT);
    await expect(page.locator('sk-tile').filter({ hasText: 'Requests received' })).toHaveCount(1);
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1)); // no page reload either
    const overview = page.waitForRequest((r) => new URL(r.url()).pathname === '/console/api/admin/shop/overview');
    await page.getByRole('combobox', { name: 'Site', exact: true }).selectOption({ label: 'Example Shop' });
    await overview;
    await expect(page.locator('main [role=status].sk-empty')).toHaveCount(0);
    await expect(page.locator('sk-tile').filter({ hasText: 'Requests received' })).toHaveCount(0); // site data of the first site only
    await expect(page.locator('sk-world-map path.sk-map__on')).toHaveCount(15);
    expect(worlds).toEqual(['/console/api/admin/audience/world.json', '/console/api/admin/shop/world.json']);
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
    await page.getByRole('combobox', { name: 'Site', exact: true }).selectOption({ label: 'Example Workshop' });
    await expect(page.locator('sk-tile').filter({ hasText: 'Requests received' })).toHaveCount(1);
  });

  test('page title hidden or at level 2 inside a page that has its own', async ({ page }) => {
    await page.goto(`${ROOT}?heading=none`);
    await expect(page.locator('sk-tile').first()).toBeVisible();
    await expect(page.locator('main h1, main .sk-title, main .sk-lead')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Period' }).first()).toBeVisible();
    await page.goto(`${ROOT}?heading=h2#youtube`);
    await expect(page.locator('main h2.sk-title')).toHaveText('YouTube');
    await expect(page.locator('main h1')).toHaveCount(0);
    expect(await axe(page)).toEqual([]);
  });
});
