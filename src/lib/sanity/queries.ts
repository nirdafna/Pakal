import { sanityClient } from 'sanity:client';
import type { CardLookup } from '../cards/resolve';
import type { PageDoc, Place, PlaceSummary, SiteSettings } from './types';

/**
 * Looks up a printed card. Returns null for an unknown number, and a null slug
 * for a card whose place is not attached or not yet published — the client is
 * configured without a token, so drafts are invisible by construction.
 */
export async function getCardByNumber(number: number): Promise<CardLookup | null> {
  return sanityClient.fetch<CardLookup | null>(
    `*[_type == "card" && number == $number][0]{ "slug": place->slug.current }`,
    { number },
  );
}

export async function getPlaces(): Promise<PlaceSummary[]> {
  return sanityClient.fetch<PlaceSummary[]>(
    `*[_type == "place" && defined(slug.current)] | order(title asc){
      title, "slug": slug.current, kind, region, summary, "image": images[0]
    }`,
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
