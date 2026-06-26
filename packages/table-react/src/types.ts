/**
 * React-bound aliases of the core types: the renderer node type is fixed to
 * React's `ReactNode`, so consumers never juggle the generic `TNode` param.
 */

import type { ColumnDef, ResolvedColumn } from '@softium/table-core';
import type { ReactNode } from 'react';

export type ReactColumnDef<T> = ColumnDef<T, ReactNode>;
export type ResolvedReactColumn<T> = ResolvedColumn<T, ReactNode>;
