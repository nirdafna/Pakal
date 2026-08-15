import { describe, expect, it } from 'vitest';
import { parseCardNumber, resolveCardPath } from './resolve';

describe('parseCardNumber', () => {
  it('parses a plain positive integer', () => {
    expect(parseCardNumber('34')).toBe(34);
  });

  it('parses a zero-padded number, because a QR generator may emit one', () => {
    expect(parseCardNumber('034')).toBe(34);
  });

  it.each(['', undefined, 'abc', '1.5', '-3', '0', '1e3', ' 12 '])(
    'rejects %p',
    (input) => {
      expect(parseCardNumber(input)).toBeNull();
    },
  );

  it('rejects numbers beyond any plausible deck size', () => {
    expect(parseCardNumber('100000')).toBeNull();
  });

  it('accepts the number just below the deck-size cutoff', () => {
    expect(parseCardNumber('999')).toBe(999);
  });

  it('accepts the deck-size cutoff itself, which is inclusive', () => {
    expect(parseCardNumber('1000')).toBe(1000);
  });

  it('rejects the number just above the deck-size cutoff', () => {
    expect(parseCardNumber('1001')).toBeNull();
  });
});

describe('resolveCardPath', () => {
  it('routes to the landmark page when the card has a published place', () => {
    expect(resolveCardPath({ slug: 'ein-gedi' })).toBe('/treks/ein-gedi');
  });

  it('routes home when the card exists but has no place attached yet', () => {
    expect(resolveCardPath({ slug: null })).toBe('/');
  });

  it('routes home when the card number is unknown', () => {
    expect(resolveCardPath(null)).toBe('/');
  });

  // A raw API write can bypass the Studio-side slug validator
  // (`/^[a-z0-9-]+$/` in sanity/schemaTypes/place.ts), so resolveCardPath must
  // not trust the CMS to have enforced it. An unvalidated slug interpolated
  // into a path can carry CR/LF into `Astro.redirect()`'s Location header,
  // which Node rejects — turning a valid scan into an uncatchable 500.
  it('routes home when the slug contains a newline', () => {
    expect(resolveCardPath({ slug: 'ein-gedi\nSet-Cookie: evil' })).toBe('/');
  });

  it('routes home when the slug contains a space', () => {
    expect(resolveCardPath({ slug: 'ein gedi' })).toBe('/');
  });

  it('routes home when the slug contains Hebrew characters', () => {
    expect(resolveCardPath({ slug: 'עין-גדי' })).toBe('/');
  });
});
