import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './helpers.ts';

test.describe('on a phone', () => {
  for (const tab of ['', '#google', '#youtube']) {
    test(`full width without horizontal scrolling ${tab || '#statistics'}`, async ({ page }) => {
      await ready(page, `/${tab}`);
      await noHorizontalScroll(page);
      const button = page.locator('main .sk-seg button').first();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    });
  }
  test('accessibility AA', async ({ page }) => {
    await ready(page, '/?theme=dark');
    expect(await axe(page)).toEqual([]);
  });
  test('German labels fit on a phone too', async ({ page }) => {
    await ready(page, '/?lang=de');
    await noHorizontalScroll(page);
  });
});
