import { expect, test } from '@playwright/test';

test('homepage renders right-to-left in Hebrew', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'he');
  await expect(page.locator('h1')).toContainText('פק');
});

test('an unknown card number redirects home instead of erroring', async ({ page }) => {
  const response = await page.goto('/c/999999');
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/');
});

test('a malformed card id redirects home', async ({ page }) => {
  await page.goto('/c/not-a-number');
  expect(new URL(page.url()).pathname).toBe('/');
});

// Asserts the contract rather than a specific destination: card 1 may or may
// not have content attached at any given moment, and both outcomes are correct.
// What must never happen is a 404 or an error page.
test('a real card number resolves to a landmark page or home, never an error', async ({ page }) => {
  const response = await page.goto('/c/1');
  expect(response?.status()).toBe(200);
  const path = new URL(page.url()).pathname;
  expect(path === '/' || path.startsWith('/treks/')).toBe(true);
});

test('the landmark index renders', async ({ page }) => {
  await page.goto('/treks');
  await expect(page.locator('h1')).toContainText('המסלולים');
});

test('every WhatsApp link is a valid wa.me URL', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a[href*="wa.me"]');
  for (let i = 0; i < (await links.count()); i += 1) {
    const href = await links.nth(i).getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d{6,}/);
  }
});
