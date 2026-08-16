/**
 * The Studio-side `type: 'url'` validator on `place.mapUrl`
 * (`sanity/schemaTypes/place.ts`) constrains only edits made through the
 * Studio UI; a raw API write bypasses it entirely — the same reasoning that
 * makes `resolveCardPath` re-check a slug it was handed.
 *
 * The consequence differs, though. A bad slug produces a 500; a bad URL
 * produces a working `javascript:` link on a public page, because Astro
 * escapes attribute *values* without caring what scheme they name. So a URL
 * arriving from the CMS is checked here before it is ever rendered as `href`.
 *
 * Allows http and https only. Protocol-relative (`//evil.example`) and
 * scheme-relative inputs fail to parse as absolute URLs and are rejected too,
 * which is correct: `mapUrl` is by definition an external map link.
 */
export function safeExternalUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? raw : null;
}
