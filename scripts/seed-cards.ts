/**
 * Seeds one `card` document per printed card, so every QR resolves from day one.
 * Usage: npx tsx scripts/seed-cards.ts 54
 * Requires SANITY_WRITE_TOKEN (Editor token from sanity.io/manage) in the env.
 */
import { createClient } from '@sanity/client';

const count = Number.parseInt(process.argv[2] ?? '', 10);
if (!Number.isInteger(count) || count < 1 || count > 1000) {
  console.error('Usage: npx tsx scripts/seed-cards.ts <deck size, 1-1000>');
  process.exit(1);
}

const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error('SANITY_WRITE_TOKEN is required (create an Editor token at sanity.io/manage)');
  process.exit(1);
}

const client = createClient({
  // `process.env` is correct HERE and wrong in `sanity.config.ts`: this script
  // runs only under tsx in Node, never in a browser bundle. The Studio config
  // ships to the client, where Vite rewrites `process.env` to `{}` and the id
  // silently becomes undefined — so that file uses `import.meta.env` instead.
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-08-15',
  token,
  useCdn: false,
});

const tx = client.transaction();
for (let number = 1; number <= count; number += 1) {
  // Deterministic _id keeps this idempotent: re-running updates nothing and
  // never creates a duplicate card for the same printed number.
  tx.createIfNotExists({ _id: `card-${number}`, _type: 'card', number, label: `${number}` });
}

const result = await tx.commit();
console.info(`Seeded/verified ${count} cards (${result.results.length} documents).`);
