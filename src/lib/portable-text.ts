import type { PortableTextBlock } from '@portabletext/types';

/**
 * Splits a CMS body into one group per `h2`, so a long page can be rendered as
 * a stack of cards instead of one wall of text.
 *
 * The instructions page is 90 blocks of numbered rules; reading it as a single
 * run is the problem the card layout exists to solve. Grouping happens here
 * rather than in the page because `@portabletext/to-html` takes a block array
 * and returns an HTML string — once it has run there is no seam left to split
 * on. Passing it one array per section is the only way to get a container
 * around each one.
 *
 * Blocks that appear before the first `h2` — a standfirst, an image — form
 * their own leading group rather than being dropped or folded into section one.
 * A body with no `h2` at all comes back as a single group, which renders as one
 * card and looks exactly like the old layout.
 */
export function splitIntoSections(
  blocks: PortableTextBlock[] | undefined,
): PortableTextBlock[][] {
  if (!blocks?.length) return [];

  const sections: PortableTextBlock[][] = [];

  for (const block of blocks) {
    if (block.style === 'h2' || sections.length === 0) {
      sections.push([block]);
    } else {
      sections[sections.length - 1].push(block);
    }
  }

  return sections;
}
