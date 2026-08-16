import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './urls';

describe('safeExternalUrl', () => {
  it('passes an ordinary https map link through unchanged', () => {
    const url = 'https://maps.google.com/?q=31.4,35.4';
    expect(safeExternalUrl(url)).toBe(url);
  });

  it('allows http, because some municipal map sites still have no TLS', () => {
    expect(safeExternalUrl('http://example.org/map')).toBe('http://example.org/map');
  });

  it.each([undefined, null, ''])('returns null for %p so the link is omitted', (input) => {
    expect(safeExternalUrl(input)).toBeNull();
  });

  // The regression this function exists for. `type: 'url'` in the Studio schema
  // is a form-level validator; a raw API write never sees it. Rendered into
  // `href` unchecked, this is stored XSS on a public page.
  it('rejects a javascript: URL', () => {
    expect(safeExternalUrl('javascript:alert(document.cookie)')).toBeNull();
  });

  it('rejects a javascript: URL disguised by case and padding', () => {
    expect(safeExternalUrl('  JaVaScRiPt:alert(1)')).toBeNull();
  });

  it('rejects a data: URL, which can carry an HTML payload', () => {
    expect(safeExternalUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeNull();
  });

  it('rejects vbscript:', () => {
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects file:, which would point the reader at their own disk', () => {
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects a protocol-relative URL, which is not an absolute map link', () => {
    expect(safeExternalUrl('//evil.example/map')).toBeNull();
  });

  it('rejects a bare path, for the same reason', () => {
    expect(safeExternalUrl('/treks/ein-gedi')).toBeNull();
  });
});
