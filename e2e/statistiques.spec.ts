import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './outils';

test.describe('page Statistiques', () => {
  test('toutes les sections, sur données factices', async ({ page }) => {
    await ready(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Statistiques' })).toBeVisible();
    for (const name of ['Pages vues et visiteurs par jour', 'Ce que les visiteurs en font', 'D’où viennent les visites', 'Dernières 24 heures', 'Quand viennent-ils ?', 'Pages les plus vues', 'Fiches produit les plus vues', 'Canaux d’acquisition', 'Navigateurs', 'Actions des visiteurs', 'Demandes reçues par sujet', 'Dernières sessions']) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/\d+ visiteurs? actifs?/)).toBeVisible();
    await expect(page.locator('sk-world-map path.sk-map__on').first()).toBeVisible();
    await expect(page.locator('sk-world-map path.sk-map__on')).toHaveCount(15);
    await expect(page.getByRole('row', { name: /France/ }).first()).toBeVisible();
    await expect(page.locator('sk-heatmap .sk-heat__cell')).toHaveCount(168);
    await expect(page.locator('sk-trend-chart rect.sk-bar').first()).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('les styles globaux du site ne cassent rien (svg, .bar, .card…)', async ({ page }) => {
    await ready(page);
    const box = await page.locator('sk-trend-chart svg').first().boundingBox();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(150);
    const map = await page.locator('sk-world-map svg').boundingBox();
    expect(map!.width).toBeGreaterThan(300);
    await expect(page.locator('sk-trend-chart rect.sk-bar').first()).toBeVisible();
    expect(await page.locator('sk-statistiques [class*="card"]').first().evaluate((e) => getComputedStyle(e).borderStyle)).not.toBe('dashed');
  });

  test('périodes : 24 heures, 7 jours, dates choisies', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: '24 h' }).click();
    await expect(page.getByRole('heading', { name: 'Pages vues et visiteurs par heure' })).toBeVisible();
    await expect(page.getByText('24 dernières heures')).toBeVisible();
    await page.getByRole('button', { name: '7 jours' }).click();
    await expect(page.getByText(/\(7 jours\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Personnalisée' }).click();
    await page.getByLabel('Du', { exact: true }).fill('2026-11-01');
    await page.getByLabel('au', { exact: true }).fill('2026-11-10');
    await page.getByRole('button', { name: 'Afficher', exact: true }).click();
    await expect(page.getByText(/du 1 nov\. au 10 nov\. \(10 jours\)/)).toBeVisible();
  });

  test('tableaux : tri, filtre, dépliage, export CSV', async ({ page }) => {
    await ready(page);
    const table = page.locator('sk-metric-table').filter({ has: page.getByRole('heading', { name: 'Pages les plus vues' }) });
    await expect(table.locator('tbody tr')).toHaveCount(12);
    await table.getByRole('button', { name: /Afficher les \d+ lignes/ }).click();
    await expect(table.locator('tbody tr')).toHaveCount(16);
    await table.getByRole('searchbox').fill('contact');
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await table.getByRole('searchbox').fill('');
    await table.getByRole('button', { name: 'Temps' }).click();
    await expect(table.locator('th[aria-sort=descending]')).toHaveText(/Temps/);
    const download = page.waitForEvent('download');
    await table.getByRole('button', { name: 'Exporter en CSV : Pages les plus vues' }).click();
    expect((await download).suggestedFilename()).toBe('pages-les-plus-vues.csv');
    const all = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter (CSV)' }).click();
    expect((await all).suggestedFilename()).toMatch(/^statistiques-30j-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('rapport : aperçu dans un nouvel onglet, envoi confié au site', async ({ page, context, request }) => {
    await ready(page);
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Aperçu du rapport' }).click();
    const tab = await popup;
    await expect(tab.getByText('Fréquentation du site')).toBeVisible();
    await expect(tab.locator('img[alt="Carte du monde des visites par pays"]')).toBeVisible();
    expect(await tab.locator('img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(600);
    const before = (await (await request.get('/api/demo/outbox')).json()).length;
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Envoyer le rapport' }).click();
    await expect(page.getByText('Rapport envoyé à 2 destinataires.')).toBeVisible();
    const outbox = await (await request.get('/api/demo/outbox')).json();
    expect(outbox.length).toBe(before + 1);
    expect(outbox.at(-1).attachments).toBe(1);
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: 'Envoyer le rapport' }).click();
    expect((await (await request.get('/api/demo/outbox')).json()).length).toBe(before + 1);
  });

  test('carte : infobulle et zoom', async ({ page }) => {
    await ready(page);
    const svg = page.locator('sk-world-map svg');
    const before = await svg.getAttribute('viewBox');
    await page.locator('sk-world-map').getByRole('button', { name: 'Zoomer', exact: true }).click();
    expect(await svg.getAttribute('viewBox')).not.toBe(before);
    await page.locator('sk-world-map').getByRole('button', { name: 'Recadrer' }).click();
    expect(await svg.getAttribute('viewBox')).toBe(before);
    await page.locator('sk-world-map path.sk-map__on').first().hover();
    await expect(page.locator('.sk-map__tip')).toContainText('visites');
  });

  test('clavier : sections et tri accessibles', async ({ page }) => {
    await ready(page);
    await page.getByRole('link', { name: 'Sources', exact: true }).click();
    await expect(page.locator('#sk-sources')).toBeFocused();
    const sortButton = page.locator('sk-metric-table').filter({ hasText: 'Canaux d’acquisition' }).getByRole('button', { name: 'Visites' });
    await sortButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('sk-metric-table').filter({ hasText: 'Canaux d’acquisition' }).locator('th[aria-sort=ascending]')).toHaveCount(1);
  });

  test('accessibilité AA, thème clair', async ({ page }) => {
    await ready(page, '/?theme=light');
    expect(await axe(page)).toEqual([]);
  });

  test('accessibilité AA, thème sombre', async ({ page }) => {
    await ready(page, '/?theme=dark');
    await expect(page.locator('sk-statistiques')).toHaveAttribute('data-sk-mode', 'dark');
    expect(await axe(page)).toEqual([]);
  });

  test('en anglais', async ({ page }) => {
    await ready(page, '/?lang=en');
    await expect(page.getByRole('heading', { level: 1, name: 'Statistics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where visits come from' })).toBeVisible();
    await expect(page.getByText(/active visitors?/)).toBeVisible();
  });
});
