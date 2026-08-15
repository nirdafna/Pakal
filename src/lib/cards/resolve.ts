export type CardLookup = { slug: string | null };

/** Upper bound on a plausible deck size, so unbounded ids can't reach the CMS. */
const MAX_CARD_NUMBER = 1000;

/**
 * Parses the `[id]` segment of a printed QR URL. Strict on purpose: anything
 * that is not a plain positive integer within deck range is treated as unknown
 * and sent home, never queried.
 */
export function parseCardNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;

  const value = Number.parseInt(raw, 10);
  if (value < 1 || value > MAX_CARD_NUMBER) return null;

  return value;
}

/**
 * The Studio-side slug validator (`sanity/schemaTypes/place.ts`) only
 * constrains edits made through the Studio UI; a raw API write can bypass it
 * entirely. A slug is trusted here only after being re-checked against the
 * same pattern, because an unvalidated slug interpolated into a redirect
 * path can carry characters (e.g. CR/LF) that make `Astro.redirect()` throw
 * when Node rejects the resulting `Location` header — an uncatchable 500 for
 * someone holding a printed card.
 */
const VALID_SLUG = /^[a-z0-9-]+$/;

/**
 * Maps a card lookup to a destination path. Every failure resolves to the
 * homepage: the person hitting a failure here is a stranger holding a printed
 * card, and a dead end is unrecoverable for them.
 */
export function resolveCardPath(card: CardLookup | null): string {
  if (!card?.slug) return '/';
  if (!VALID_SLUG.test(card.slug)) return '/';
  return `/treks/${card.slug}`;
}
