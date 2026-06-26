/**
 * @softium/table-core
 *
 * Headless core for the softium-ui Table.
 * Pure TypeScript — does not import React, DOM, or `window`.
 *
 * Phase 0: scaffold only. Types, adapters, and derivation logic land in Phase 1.
 */

export const VERSION = '0.0.0';

export type { Placeholder } from './types';
export * from './adapters';
export * from './derive';
