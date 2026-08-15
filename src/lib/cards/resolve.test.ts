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
});
