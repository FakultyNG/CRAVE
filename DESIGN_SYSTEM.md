# Design system

## Brand tokens

| Token | Value | Primary use |
| --- | --- | --- |
| Crave Red | `#E4281F` | Brand fields, expressive moments |
| Cream | `#F7F0DE` | Warm surfaces, reverse logo |
| Crave Orange | `#F66610` | Calls to action and active states |
| Paper | `#FFFAF3` | Main application background |
| Ink | `#1D1715` | Text and operational workspace |

Orange is an accent, not a page wash. Large red fields are balanced with cream typography and quiet off-white space.

## Typography

The CSS stacks reserve `Chillax` for display and `Aeonik` for body copy. Because licensed font files were not supplied, Phase 1 bundles Manrope Variable and Plus Jakarta Sans Variable as metrically practical fallbacks. Supplying licensed `.woff2` files will allow a direct swap without changing component typography.

## Shape and motion

Cards use generous organic radii, navigation floats above content, and workspace surfaces remain quieter than customer storytelling. Motion uses eased opacity/translation reveals, respects `prefers-reduced-motion`, and never blocks an action.

## Assets

- `crave-logo-red.png`: light surfaces.
- `crave-logo-cream.png`: red/dark surfaces.
- `mascot-red.png` and `mascot-cream.png`: deliberate character moments.
- `mascot-outline.svg`: watermark and low-contrast atmospheric artwork.

Touch targets are at least 44px, focus states remain visible, and text contrast must be checked whenever new campaign colours are introduced.
