/**
 * Flatten a CSS entrypoint into a single self-contained file with every
 * `@import` (relative *and* bare `@softium/*` specifiers) inlined.
 *
 *   node scripts/bundle-css.mjs <entry.css> <out.css>
 *
 * Source stylesheets keep their `@import "@softium/styles"` so Vite resolves
 * them during dev; the published `dist/*.css` this produces has no imports at
 * all, so it works in plain <link>, CDN, and non-Vite bundler setups too
 * (REVIEW P1). postcss-import resolves bare specifiers via node_modules from
 * the entry's directory, so each package must depend on what it imports.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import postcss from 'postcss';
import atImport from 'postcss-import';

const [entry, out] = process.argv.slice(2);
if (!entry || !out) {
  console.error('usage: node scripts/bundle-css.mjs <entry.css> <out.css>');
  process.exit(1);
}

const css = readFileSync(entry, 'utf8');
const result = await postcss([atImport()]).process(css, { from: entry, to: out });

if (/@import\s/.test(result.css)) {
  console.error(`✗ ${out} still contains an unresolved @import — check the specifier`);
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, result.css);
console.log(
  `✓ bundled ${entry} → ${out} (${(result.css.length / 1024).toFixed(1)} KB, no @import)`,
);
