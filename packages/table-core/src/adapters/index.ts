/**
 * Adapters: absorb any server shape into the library's `TableInput<T>`.
 *
 * Phase 1 ships three helpers (SPEC §4):
 *   - adaptArray(raw)             — plain array
 *   - adaptPaginated(raw, opts)   — { data, total, page, pageSize } wrapper
 *   - adaptDynamicSchema(raw, …)  — server sends column defs too (legacy ERP)
 */

export {};
