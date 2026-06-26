/**
 * Derivation: the original `data` is never mutated. Every view change is derived.
 *
 * Phase 1 ships (SPEC §2, §3):
 *   - renderColumns = merge(columnDefs, columnState) → filter visible → sort by order
 *   - rowId / displayIndex / globalIndex assignment
 * Phase 4 adds derived sort / filter / search over copies of `data`.
 */

export {};
