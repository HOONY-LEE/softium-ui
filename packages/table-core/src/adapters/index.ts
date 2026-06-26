/**
 * Adapters: absorb any server shape into data (+ optionally columns) the library
 * understands. The library itself only ever consumes the normalized output.
 */

export { adaptArray } from './adaptArray';
export { adaptPaginated } from './adaptPaginated';
export type { AdaptPaginatedOptions, PaginatedResult } from './adaptPaginated';
export { adaptDynamicSchema } from './adaptDynamicSchema';
export type {
  AdaptDynamicSchemaOptions,
  DynamicSchemaResult,
} from './adaptDynamicSchema';
