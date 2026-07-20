/**
 * Prepend the `"use client"` directive to built JS bundles.
 *
 *   node scripts/add-use-client.mjs <file.js> [more.js ...]
 *
 * tsup's `banner` option is dropped by its rollup treeshake pass (it strips
 * leading module directives), so we stamp the directive after the build
 * instead. Next.js App Router needs `"use client"` as the first statement to
 * treat these client-only (hooks/DOM) packages as client modules (REVIEW P7).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DIRECTIVE = '"use client";';

for (const file of process.argv.slice(2)) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue; // format not emitted (e.g. cjs-only builds) — skip silently
  }
  if (src.startsWith('"use client"') || src.startsWith("'use client'")) continue;
  // keep "use client" as the very first statement, ahead of any 'use strict'
  writeFileSync(file, `${DIRECTIVE}\n${src}`);
  console.log(`✓ stamped "use client" → ${file}`);
}
