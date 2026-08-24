import { describe, expect, it } from 'vitest';
import type { PortableTextBlock } from '@portabletext/types';
import { splitIntoSections } from './portable-text';

const block = (style: string, text: string): PortableTextBlock =>
  ({
    _type: 'block',
    _key: text,
    style,
    children: [{ _type: 'span', _key: `${text}-0`, text, marks: [] }],
    markDefs: [],
  }) as unknown as PortableTextBlock;

const texts = (sections: PortableTextBlock[][]) =>
  sections.map((section) =>
    section.map((b) => (b.children as { text: string }[])[0].text).join('|'),
  );

describe('splitIntoSections', () => {
  it('starts a new section at every h2', () => {
    const sections = splitIntoSections([
      block('h2', 'one'),
      block('normal', 'a'),
      block('h2', 'two'),
      block('normal', 'b'),
    ]);

    expect(texts(sections)).toEqual(['one|a', 'two|b']);
  });

  it('keeps every block that follows an h2 with it', () => {
    const sections = splitIntoSections([
      block('h2', 'one'),
      block('normal', 'a'),
      block('h3', 'sub'),
      block('normal', 'b'),
    ]);

    expect(texts(sections)).toEqual(['one|a|sub|b']);
  });

  // A standfirst above the first heading must not be swallowed into section one
  // or silently dropped — either would lose copy the editor published.
  it('gives blocks before the first h2 a section of their own', () => {
    const sections = splitIntoSections([
      block('normal', 'intro'),
      block('h2', 'one'),
      block('normal', 'a'),
    ]);

    expect(texts(sections)).toEqual(['intro', 'one|a']);
  });

  // The fallback that keeps every other CMS page working: no h2 means one card,
  // which renders identically to the single-container layout this replaced.
  it('returns a single section when the body has no h2', () => {
    const sections = splitIntoSections([block('normal', 'a'), block('normal', 'b')]);

    expect(texts(sections)).toEqual(['a|b']);
  });

  it('returns nothing for an empty or missing body', () => {
    expect(splitIntoSections([])).toEqual([]);
    expect(splitIntoSections(undefined)).toEqual([]);
  });
});
