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

// The mockup puts its only red on the card suits in the logo. `--color-accent`
// existed as a token for weeks while nothing referenced it, so the palette was
// documented as three colours and rendered as two. This asserts the red is
// actually on the page, not merely defined.
//
// Matches by glyph rather than by class name, so a restyle of the wordmark
// does not silently disable the check.
test('the card-suit accent colour actually renders in the logo', async ({ page }) => {
  await page.goto('/');

  const { applied, token } = await page.evaluate(() => {
    const suit = [...document.querySelectorAll('header *')].find(
      (el) => el.children.length === 0 && el.textContent?.trim() === '♦',
    );
    return {
      applied: suit ? getComputedStyle(suit).color : null,
      token: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent')
        .trim(),
    };
  });

  expect(applied, 'no ♦ suit glyph found in the header logo').not.toBeNull();

  const [r, g, b] = token.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  expect(applied).toBe(`rgb(${r}, ${g}, ${b})`);
});

// The header collapsed at phone width before this menu existed: five links
// wrapping into three ragged rows beside a squeezed trust marker. Phones are
// the primary device here — the reader arrives by scanning a printed card — so
// the disclosure is guarded rather than left to the next desktop screenshot.
test('the phone header hides its links behind a menu until opened', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');

  const menu = page.getByRole('group').or(page.locator('details')).first();
  const linkInPanel = menu.getByRole('link', { name: 'מתנה לחברות' });

  await expect(linkInPanel).toBeHidden();
  await page.locator('summary').click();
  await expect(linkInPanel).toBeVisible();
});

// The same links must be reachable without opening anything on a wide screen —
// the disclosure is a phone affordance, not a hiding place.
test('the wide header shows its links without a menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await expect(page.locator('summary')).toBeHidden();
  await expect(page.getByRole('link', { name: 'מתנה לחברות' })).toBeVisible();
});

// The hero photograph is meant to run the full height of the first screen and
// pass *behind* the navigation, as the approved mockup shows. The mechanism is
// a negative top margin on the section cancelled by equal top padding on its
// contents (see `src/pages/index.astro`), which is exactly the kind of thing a
// later spacing tweak undoes without anyone noticing on a screenshot.
//
// Skipped rather than passed vacuously when no photo is published: with
// `siteSettings.heroImage` empty there is no image element to measure, and an
// assertion over a missing element is a guard that cannot fail.
test('the hero photograph runs behind the header and fills the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const photo = page.locator('main section img').first();
  test.skip(
    (await photo.count()) === 0,
    'no hero photograph rendered — siteSettings.heroImage not published yet',
  );

  const [photoBox, headerBox] = [
    await photo.boundingBox(),
    await page.locator('header').boundingBox(),
  ];
  expect(photoBox, 'hero photograph has no layout box').toBeTruthy();
  expect(headerBox, 'header has no layout box').toBeTruthy();

  // Starts at or above the header's own top edge, so the nav sits on the photo.
  expect(photoBox!.y).toBeLessThanOrEqual(headerBox!.y);
  // And reaches the fold: a section that collapsed back to its content height
  // would still overlap the header but no longer fill the screen.
  expect(photoBox!.height).toBeGreaterThanOrEqual(800);
});

// The copy column is held against the inline-start edge — the right, in this
// RTL document — so it clears the box and cards on the left of the photograph.
// Re-centring it is a one-word change in the markup and invisible in a diff.
test('the hero copy sits on the right half of the screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Measured against the hero container's own right edge rather than against
  // the middle of the screen: a centred `max-w-xl` column still has most of its
  // content in the right half, so a midpoint assertion passes on the layout
  // this test exists to reject. The gap allowed here is the container's own
  // `px-4`.
  //
  // The COLUMN is what is pinned right, not the heading: the copy is centred
  // inside the column, so the mark's own edges float. Measuring the heading
  // would fail on a layout that is correct.
  const container = await page
    .locator('main section > div')
    .filter({ has: page.locator('h1') })
    .boundingBox();
  const column = await page
    .locator('main section > div > div')
    .filter({ has: page.locator('h1') })
    .boundingBox();
  expect(container, 'no hero container layout box').toBeTruthy();
  expect(column, 'no hero copy column layout box').toBeTruthy();

  const gapToRightEdge = container!.x + container!.width - (column!.x + column!.width);
  expect(gapToRightEdge).toBeLessThanOrEqual(40);
});

// The instructions page is the first inner page to take the homepage's
// treatment: the photograph fixed behind the whole viewport, the rules in one
// card per numbered section travelling over it, and no scrollbar. Each half is
// easy to undo by accident — the card split lives in `splitIntoSections`, the
// stillness in a single `position: fixed`, and the hidden bar in one utility
// class that must never take the scrolling with it.
test('the instructions page cards each rule section', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  const cards = page.locator('main article');
  const cardCount = await cards.count();

  test.skip(cardCount === 0, 'no CMS body published for how-to-play');

  // One card per section, not one card around everything: with the published
  // body that is nine-ish cards, and a regression to a single container makes
  // this exactly 1.
  expect(cardCount).toBeGreaterThan(1);
  // Every card is headed by its own section title — an off-by-one in the split
  // would leave a headless card carrying orphaned paragraphs.
  expect(await page.locator('main article h2').count()).toBe(cardCount);
});

test('the instructions photograph holds still while the rules scroll over it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  const photo = page.locator('body > div img').first();
  test.skip(
    (await photo.count()) === 0,
    'no photograph rendered — siteSettings.heroImage not published yet',
  );

  const firstCard = page.locator('main article').first();
  const before = { photo: await photo.boundingBox(), card: await firstCard.boundingBox() };
  expect(before.photo, 'photograph has no layout box').toBeTruthy();

  // Edge to edge, including out past both sides of the text column.
  expect(before.photo!.width).toBeGreaterThanOrEqual(1280);
  expect(before.photo!.height).toBeGreaterThanOrEqual(800);

  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForFunction(() => window.scrollY === 600);

  const after = { photo: await photo.boundingBox(), card: await firstCard.boundingBox() };
  // The card moved by the full scroll distance and the photograph did not move
  // at all. Together those two are the effect; either alone passes on a layout
  // that does not have it.
  expect(after.card!.y).toBeCloseTo(before.card!.y - 600, 0);
  expect(after.photo!.y).toBeCloseTo(before.photo!.y, 0);
});

// The bar is hidden; the scrolling must not be. Hiding both would strand a
// reader on section one with no keyboard, wheel or find-in-page way out, and
// nothing else in the suite would notice.
test('the instructions page hides its scrollbar without disabling scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  const { scrollbarWidth, scrollable } = await page.evaluate(() => ({
    scrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth,
    scrollable: document.documentElement.scrollHeight > window.innerHeight + 100,
  }));

  expect(scrollbarWidth).toBe('none');
  expect(scrollable, 'nothing to scroll — this test would pass vacuously').toBe(true);

  await page.keyboard.press('End');
  await page.waitForFunction(() => window.scrollY > 0);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

// The title bar pins so a reader deep in the rules still knows which page they
// are on. `sticky top-0` is one word away from scrolling off with everything
// else, and nothing else in the suite would notice.
test('the instructions title stays put while the rules scroll past it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  const heading = page.locator('main h1');
  const before = await heading.boundingBox();
  expect(before, 'no h1 layout box').toBeTruthy();

  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForFunction(() => window.scrollY === 700);

  const after = await heading.boundingBox();
  // It does not move at all. The navigation above it is pinned too and is
  // exactly as tall as the offset this bar pins at, so the title occupies the
  // same strip of screen at rest and at full scroll. Without `sticky` it would
  // have travelled the full 700px and sat far above the viewport.
  expect(after!.y).toBeCloseTo(before!.y, 0);
  await expect(heading).toBeInViewport();
});

// The point of pinning the navigation: a reader who has scrolled deep into the
// rules can still leave the page. Without it the only way out is to scroll all
// the way back to the top, which on a ninety-block page is a long way.
test('the instructions navigation stays reachable from deep in the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForFunction(() => window.scrollY === 1500);

  // A real link, not the header box: the header could be pinned and still have
  // its contents scrolled out of it.
  await expect(page.getByRole('link', { name: 'דף הבית', exact: true })).toBeInViewport();
  // And the nav still sits above the title it shares the band with.
  const nav = await page.locator('header').boundingBox();
  const heading = await page.locator('main h1').boundingBox();
  expect(nav!.y + nav!.height).toBeLessThanOrEqual(heading!.y + 1);
});

// The homepage's brand mark is a size up, and the hero's overlap with the
// header has to keep covering it. Those two are only correct together: growing
// the mark without growing the overlap leaves a strip of bare sand above the
// photograph, which is exactly the kind of thing a screenshot at one viewport
// misses. Asserted as a comparison between the two pages, so it fails if the
// homepage stops asking for the larger mark *or* if an inner page starts.
test('the homepage carries a larger brand mark than the inner pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/how-to-play');
  const inner = await page.locator('header').boundingBox();

  await page.goto('/');
  const home = await page.locator('header').boundingBox();
  const photo = await page.locator('main section img').first().boundingBox();

  expect(home!.height).toBeGreaterThan(inner!.height);
  // And the photograph still starts at or above the taller header's top edge.
  expect(photo, 'no hero photograph').toBeTruthy();
  expect(photo!.y).toBeLessThanOrEqual(home!.y);
});

// On a phone the hero's buttons landed on top of a card *inside the
// photograph* — the card's own label showed through the outlined button. The
// photograph is fixed content, so the copy is what had to move.
//
// Tested at 360, the narrow end of the phone range and the worst case: the lead
// has least room there, and a third line of it is what pushed the buttons down
// onto the card in the first place. The line count is the real mechanism and is
// asserted directly; the position bound is the outcome. Either one alone would
// let this regress — copy can grow without rewrapping, and it can rewrap
// without growing.
test('the phone hero keeps its buttons off the card in the photograph', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const leadLines = await page.evaluate(() => {
    const p = document.querySelector('main section p')!;
    return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
  });
  expect(leadLines, 'the lead rewrapped and pushed the buttons down').toBeLessThanOrEqual(2);

  const cta = await page.getByRole('link', { name: 'למסלולים שבחפיסה' }).boundingBox();
  expect(cta, 'no route-list call to action').toBeTruthy();
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(415);

  // And it did not get there by crowding the navigation.
  const header = await page.locator('header').boundingBox();
  const heading = await page.locator('main section h1').boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
});

// The instructions page's top should read like the homepage's — the photograph
// visible behind the navigation — but its title bar is pinned, so it also has
// to be opaque enough that rule cards do not show through as they pass under
// it. Those two only reconcile in time: transparent at the top of the page,
// where there is nothing underneath yet, frosted once the page has moved.
//
// Where scroll-driven animations are unsupported the rule never applies and the
// bar stays frosted throughout, which is the safe half of the trade rather than
// the broken one. This browser supports them, so the test asserts the enhanced
// behaviour; `CSS.supports` is checked first so it cannot pass vacuously.
test('the instructions bar shows the photograph until the page is scrolled', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/how-to-play');

  const supported = await page.evaluate(() =>
    CSS.supports('animation-timeline', 'scroll(root)'),
  );
  test.skip(!supported, 'no scroll-driven animation support in this browser');

  const frost = page.locator('.frost-on-scroll').first();
  await expect(frost).toHaveCount(1);

  const opacity = () => frost.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(await opacity(), 'the frosting hides the photograph at rest').toBeLessThan(0.05);

  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForFunction(() => window.scrollY === 300);
  expect(await opacity(), 'the frosting never arrived, so cards show through').toBeGreaterThan(
    0.95,
  );
});

// The scrim's ramp is horizontal, which only works while there is a left and a
// right to it. On a phone the copy spans the full width, the ramp compresses
// into that span, and the far end of every line lands in its transparent stop —
// measured at 375px it left the homepage's lead at 2.67:1 against the ink,
// against the 4.5:1 body text needs. Below `sm` the wash is even instead.
//
// Asserted as a shape rather than a contrast ratio: the suite has no image
// reader, so what it can check is that the phone gets a flat wash and the wide
// screen gets the gradient. Both directions matter — dropping the flat colour
// fails the phone, dropping the breakpoint costs the desktop its ramp.
test('the scrim washes evenly on a phone and ramps on a wide screen', async ({ page }) => {
  const scrimStyle = async () =>
    page.locator('main section img').first().evaluate((img) => {
      const scrim = img.nextElementSibling as HTMLElement;
      const cs = getComputedStyle(scrim);
      return { image: cs.backgroundImage, color: cs.backgroundColor };
    });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const phone = await scrimStyle();
  expect(phone.image, 'a phone still gets the compressed ramp').toBe('none');
  expect(phone.color, 'a phone gets no wash at all').not.toBe('rgba(0, 0, 0, 0)');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const wide = await scrimStyle();
  expect(wide.image, 'the wide screen lost its ramp').toContain('gradient');
});
