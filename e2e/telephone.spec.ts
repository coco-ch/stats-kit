import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './outils.ts';

test.describe('au téléphone', () => {
  for (const tab of ['', '#google', '#youtube']) {
    test(`pleine largeur sans défilement horizontal ${tab || '#statistiques'}`, async ({ page }) => {
      await ready(page, `/${tab}`);
      await noHorizontalScroll(page);
      const button = page.locator('main .sk-seg button').first();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }
  test('accessibilité AA', async ({ page }) => {
    await ready(page, '/?theme=dark');
    expect(await axe(page)).toEqual([]);
  });
});
