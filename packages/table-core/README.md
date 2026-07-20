# @softium/table-core

Headless core for the softium-ui Table: types, data adapters, and derivation
logic (columns, rows, sort, filter, search, paginate, pivot) plus export
serializers (CSV / Excel / JSON / XML). Knows nothing about the DOM or React.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui). Most apps use
[`@softium/table-react`](https://github.com/HOONY-LEE/softium-ui/tree/main/packages/table-react)
(which wraps this) rather than this package directly.

## Install

```bash
npm i @softium/table-core
```

Zero runtime dependencies. Framework-agnostic.

## Usage

```ts
import { adaptArray, resolveColumns, buildRows } from '@softium/table-core';

const source = adaptArray([{ id: 1, name: 'Widget' }]);
// resolve column defs against column state, derive display rows, etc.
```

See the repo README for the 3-layer architecture (`data` / `columnDefs` /
`columnState`) and the adapter pattern.

## License

MIT © Sunghoon Lee
