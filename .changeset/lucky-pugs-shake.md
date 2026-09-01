---
'@softium/table-core': minor
'@softium/table-react': minor
'@softium/table-styles': minor
'softium-ui': minor
---

Add an ag-Grid-style per-column header menu with type-aware filtering.

Hovering a column header reveals a "⋮" trigger; clicking it opens a menu with sort
(asc / desc / clear), pin (left / right / none), autosize (this column / all
columns), hide column, and reset columns — plus a filter editor chosen from the
column's type:

- `select` → a checklist of the column's distinct values (searchable past 8 options)
- `date` → an inclusive from–to range
- `number` → an operator (= ≠ > ≥ < ≤ / between) with one or two operands
- `boolean` → any / true / false
- everything else → contains / equals / starts with / ends with / blank

Override per column with `filterVariant`, and supply an explicit choice list with
`filterOptions`. A filtered column keeps its trigger lit as a badge.

New core exports: `FilterVariant`, `defaultFilterVariant`, `getDistinctValues`, and
the `startsWith` / `endsWith` / `blank` / `notBlank` filter operators.

**Fix:** comparison operators (`gt`/`gte`/`lt`/`lte`/`between`/`eq`) coerced values
with `Number()`, so on a `date` column an ISO string like `"2024-03-15"` became
`NaN` and every date range matched nothing. Date columns now compare by calendar
day, and a `Date` object and its ISO string compare equal with no timezone drift.
