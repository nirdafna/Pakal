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
 * Maps a card lookup to a destination path. Every failure resolves to the
 * homepage: the person hitting a failure here is a stranger holding a printed
 * card, and a dead end is unrecoverable for them.
 */
export function resolveCardPath(card: CardLookup | null): string {
  if (!card?.slug) return '/';
  return `/treks/${card.slug}`;
}
