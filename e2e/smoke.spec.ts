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
  const count = await links.count();

  // Until `siteSettings.whatsappPhone` is published there are no CTAs to check,
  // and a loop over zero elements would pass green having asserted nothing —
  // the worst outcome for a test guarding "a malformed link is a lost sale with
  // no error anywhere". Skipping makes the gap visible in the run report.
  test.skip(count === 0, 'no WhatsApp CTA rendered — siteSettings.whatsappPhone not published yet');

  for (let i = 0; i < count; i += 1) {
    const href = await links.nth(i).getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d{6,}/);
  }
});

// Guards the CSP/inline-style interaction, which failed silently once: with a
// policy enabled and the brand colour set through an inline `style` attribute,
// the browser dropped the style and the heading rendered in the default ink
// colour — green build, passing tests, no console error, wrong colours.
//
// This compares the *applied* colour against the `--color-brand` token rather
// than a literal, so re-branding does not require editing the test, but any
// future change that stops the token reaching the heading still fails it.
test('the brand colour actually reaches the heading', async ({ page }) => {
  const response = await page.goto('/');

  // Assert the policy is actually in force first. Without this the colour
  // check below would pass just as happily with CSP switched off, which is the
  // one state it is supposed to detect — a guard that cannot fail is worse
  // than no guard.
  const header = response?.headers()['content-security-policy'];
  const meta = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute('content')
    .catch(() => null);
  const policy = header ?? meta;
  expect(policy, 'no CSP in force — this test would pass vacuously').toBeTruthy();
  expect(policy).toContain("script-src 'self'");

  const { applied, token } = await page.evaluate(() => ({
    applied: getComputedStyle(document.querySelector('h1')!).color,
    token: getComputedStyle(document.documentElement)
      .getPropertyValue('--color-brand')
      .trim(),
  }));

  const [r, g, b] = token.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  expect(applied).toBe(`rgb(${r}, ${g}, ${b})`);
});

// Guards `.prose-pakal`, which `PortableText.astro` puts on every CMS body and
// which was referenced without ever being defined. Tailwind's preflight strips
// heading sizes and list markers, so the class being absent is invisible in a
// build and in every unit test — it shows up only as rendered text that has
// lost its structure.
//
// Both assertions are chosen to fail in the unstyled state: with preflight and
// no rules, an `h2` computes to the same size as a `p`, and `ul` computes to
// `list-style-type: none`.
test('CMS body copy keeps its heading hierarchy and list markers', async ({ page }) => {
  await page.goto('/how-to-play');
  const prose = page.locator('.prose-pakal');

  // The page falls back to "התוכן בהכנה" outside the prose wrapper when no
  // `page` document is published, and there would then be nothing to style.
  // Skipping keeps that state visible in the report instead of passing green.
  test.skip((await prose.count()) === 0, 'no how-to-play body published — nothing to style');

  const computed = await page.evaluate(() => {
    const root = document.querySelector('.prose-pakal')!;
    const heading = root.querySelector('h2');
    const para = root.querySelector('p');
    const list = root.querySelector('ul');
    return {
      headingSize: heading ? parseFloat(getComputedStyle(heading).fontSize) : null,
      paraSize: para ? parseFloat(getComputedStyle(para).fontSize) : null,
      listStyle: list ? getComputedStyle(list).listStyleType : null,
      // In an RTL document `padding-inline-start` resolves to `padding-right`.
      // A `padding-left` written by hand would leave this at 0 and put the
      // markers on the wrong side — the exact mistake the repo bans logical
      // properties to prevent.
      listPadStart: list ? parseFloat(getComputedStyle(list).paddingRight) : null,
    };
  });

  expect(computed.headingSize, 'no h2 in the rendered body').not.toBeNull();
  expect(computed.paraSize, 'no p in the rendered body').not.toBeNull();
  expect(computed.headingSize!).toBeGreaterThan(computed.paraSize!);

  if (computed.listStyle !== null) {
    expect(computed.listStyle).not.toBe('none');
    expect(computed.listPadStart!).toBeGreaterThan(0);
  }
});
