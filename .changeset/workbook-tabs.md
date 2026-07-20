---
"@softium/sheet": minor
"softium-ui": patch
---

Add `Workbook`: a Google-Sheets-style tab bar over multiple `Sheet` grids —
tabs along the bottom, a `+` on the right to append, double-click (or
Enter/F2) on a tab to rename, and an `×` on the active tab to delete (blocked
when one sheet remains).

Inactive sheets stay mounted and are hidden with CSS instead of being
unmounted, so each grid keeps its own values, formats, column sizes and
undo/redo history across tab switches.
