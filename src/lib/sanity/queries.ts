import { sanityClient } from 'sanity:client';
import type { CardLookup } from '../cards/resolve';
import type { PageDoc, Place, PlaceSummary, SiteSettings } from './types';

/**
 * Looks up a printed card. Returns null for an unknown number, and a null slug
 * for a card whose place is not attached or not yet published — the client is
 * configured without a token, so drafts are invisible by construction.
 *
 * Unlike the other functions in this file, this one is reachable at request
 * time (from the `/c/[id]` route), not only at build time. It throws on
 * network or API failure rather than swallowing it — callers reaching it at
 * request time MUST catch and fall back to the homepage, because an
 * uncaught rejection there becomes a crash page for someone standing on a
 * trail holding a printed card, not a build failure a developer sees first.
 */
export async function getCardByNumber(number: number): Promise<CardLookup | null> {
  return sanityClient.fetch<CardLookup | null>(
    `*[_type == "card" && number == $number][0]{ "slug": place->slug.current }`,
    { number },
  );
}

/**
 * `limit` slices in GROQ rather than in JS. The homepage shows three landmarks;
 * without this it fetched the whole deck — title, summary and an image ref per
 * place — and discarded all but three after the response had already crossed
 * the wire. Harmless at today's row count, and it grows with the deck.
 */
export async function getPlaces(limit?: number): Promise<PlaceSummary[]> {
  const slice = limit === undefined ? '' : '[0...$limit]';
  return sanityClient.fetch<PlaceSummary[]>(
    `*[_type == "place" && defined(slug.current)] | order(title asc)${slice}{
      title, "slug": slug.current, kind, region, summary, "image": images[0]
    }`,
    limit === undefined ? {} : { limit },
  );
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  return sanityClient.fetch<Place | null>(
    `*[_type == "place" && slug.current == $slug][0]{
      title, "slug": slug.current, kind, region, summary, body, images,
      lengthKm, durationHours, difficulty, season, mapUrl, tips
    }`,
    { slug },
  );
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch<SiteSettings | null>(`*[_type == "siteSettings"][0]`);
}

export async function getPage(slug: string): Promise<PageDoc | null> {
  return sanityClient.fetch<PageDoc | null>(
    `*[_type == "page" && slug == $slug][0]{ title, slug, body }`,
    { slug },
  );
}
