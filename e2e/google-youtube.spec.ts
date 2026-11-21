import { expect, test } from '@playwright/test';
import { axe, noHorizontalScroll, ready } from './outils.ts';

test.describe('page Google', () => {
  test('toutes les sections, portée marque, indexation', async ({ page }) => {
    await ready(page, '/#google');
    await expect(page.getByRole('heading', { level: 1, name: 'Google' })).toBeVisible();
    for (const name of ['Affichages dans Google par jour', 'Clics depuis Google par jour', 'Requêtes × pages', 'Recherches à fort potentiel', 'Recherches en hausse', 'Recherches avec plusieurs pages', 'Apparence dans les résultats', 'Plan du site (sitemap)']) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Marque', exact: true }).click();
    const queries = page.locator('#sk-queries sk-metric-table').first();
    await expect(queries.locator('tbody tr').first()).toContainText('exemple');
    await page.getByRole('button', { name: 'Vérifier l’indexation' }).click();
    await expect(page.getByText(/sur 9 pages indexées/)).toBeVisible();
    await noHorizontalScroll(page);
  });
  test('accessibilité AA', async ({ page }) => {
    await ready(page, '/?theme=dark#google');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('page YouTube', () => {
  test('chaîne, côté site, vidéos', async ({ page }) => {
    await ready(page, '/#youtube');
    await expect(page.getByRole('heading', { name: 'Atelier Exemple' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ouvrir YouTube Studio' })).toHaveAttribute('href', /studio\.youtube\.com/);
    for (const name of ['Pages d’arrivée', 'Vues par jour', 'Minutes regardées par jour', 'D’où viennent les vues']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Assembler une chaise en noyer' })).toBeVisible();
    await page.getByRole('button', { name: '90 jours' }).click();
    await expect(page.getByText(/\d+ \/ jour/).first()).toBeVisible();
  });
  test('accessibilité AA', async ({ page }) => {
    await ready(page, '/?theme=light#youtube');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('sans aucune source branchée', () => {
  test.use({ baseURL: 'http://127.0.0.1:5318' });
  test('chaque page dit ce qui manque, les données du site restent', async ({ page }) => {
    await ready(page);
    await expect(page.getByText('Statistiques de visites non branchées')).toBeVisible();
    await expect(page.getByText('Demandes reçues').first()).toBeVisible();
    await ready(page, '/#google');
    await expect(page.getByText('Connexion à la Search Console non configurée')).toBeVisible();
    await ready(page, '/#youtube');
    await expect(page.getByText('Chaîne YouTube non branchée')).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});
