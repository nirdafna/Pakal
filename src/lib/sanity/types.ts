import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  asset: { _ref: string };
  alt?: string;
}

export interface PlaceSummary {
  title: string;
  slug: string;
  // The schema (`sanity/schemaTypes/place.ts`) sets only `initialValue`, not
  // `required()`, so a document can exist without `kind` — the type must not
  // assert a guarantee the schema doesn't make.
  kind?: 'trek' | 'site';
  region?: string;
  summary?: string;
  image?: SanityImage;
}

export interface Place extends PlaceSummary {
  body?: PortableTextBlock[];
  images?: SanityImage[];
  lengthKm?: number;
  durationHours?: number;
  difficulty?: string;
  season?: string;
  mapUrl?: string;
  tips?: string;
}

export interface SiteSettings {
  whatsappPhone?: string;
  purchaseMessage?: string;
  corporateMessage?: string;
  heroTitle?: string;
  heroTagline?: string;
  heroText?: string;
  heroImage?: SanityImage;
}

export interface PageDoc {
  title: string;
  slug: string;
  body?: PortableTextBlock[];
}
