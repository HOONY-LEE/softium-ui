/**
 * Type system skeleton.
 *
 * Phase 1 fills this in: ColumnType, ColumnDef<T>, ColumnState, Row<T>,
 * CellContext<T>, SearchState, Filter, TableInput<T>. (See SPEC §3.)
 *
 * Guardrails baked into these types later:
 *   - `label` (immutable) ≠ `labelOverride` (user-facing)
 *   - `rowId` (PK) ≠ `displayIndex` (view position) ≠ `globalIndex`
 *   - no `any`; row type `T` is inferred end-to-end via generics
 */

/** Temporary placeholder so the package has a valid public surface in Phase 0. */
export type Placeholder = never;
