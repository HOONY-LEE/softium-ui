---
"@softium/sheet": minor
---

The formatting toolbar no longer wraps to a second row when space runs out.
It now collapses Google-Sheets style: groups that don't fit are moved into a
trailing "⋮" button that opens them in a popover.

Group widths are probed from an out-of-flow hidden copy rather than the live
bar, because the bar's own content would otherwise widen the shrink-wrapping
wrapper and feed an inflated width back into the fit calculation. That also
keeps the bar at `overflow: visible`, so the group dropdowns (number format,
borders, Σ …) still hang below it instead of being clipped.
