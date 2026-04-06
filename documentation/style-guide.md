# Wilderness UI Style Guide

The injected UI uses a **game-hack HUD aesthetic** inspired by classic GTA SAMP modification menus (e.g., s0beit). All UI must look like it was dropped into the page from the outside — visually distinct from any host-page design, always readable regardless of background.

---

## Typography

| Property | Value |
|----------|-------|
| Font family | `'Courier New', Courier, monospace` |
| Base size | `11px` toolbar, `12px` inspect panel |
| Line height | `1` (tight) |
| Letter spacing | `0.02em` |

Never use proportional fonts in injected UI. Labels, buttons, and readouts are all mono.

---

## Color Tokens

| Role | Value | Usage |
|------|-------|-------|
| Surface | `rgba(0, 0, 0, 0.75)` | Toolbar and panel backgrounds |
| Border | `1px solid rgba(255, 255, 255, 0.15)` | All container outlines |
| Text default | `#e0e0e0` | Labels, inactive buttons |
| Text active | `#00ff88` | Enabled/toggled-on buttons |
| Text active hover | `#33ffaa` | Hover on active button |
| Text hover | `#ffffff` | Hover on any button |
| Separator | `rgba(255, 255, 255, 0.2)` | `|` chars between buttons |
| Hover fill | `rgba(255, 255, 255, 0.08)` | Button hover background |
| Accent line | `rgba(255, 255, 255, 0.4)` | Expand animation line |

---

## Layout

- **Position**: `fixed`, centered at top, `top: 8px`, `left: 50%`, `transform: translateX(-50%)`
- **Z-index**: `2147483647` (always on top)
- **Padding**: `2px 4px` inside bar; `2px` button padding
- **No border-radius** anywhere — sharp corners only
- **No box-shadow** — panels use border only

---

## Interactive Elements

Buttons use bracket notation: `[LABEL]` or `[LABEL:STATE]`.
Section headings are plain uppercase text (for example, `SETUP TIMING:`), not bracketed labels.  
Bracketed non-interactive labels are reserved for status tags (`[STATUS]`, `[ERROR]`, `[WARNING]`, etc.).

```
[GUIDES:OFF]  →  inactive, default text color
[GUIDES:ON]   →  active, #00ff88
[CONSOLE(3)]  →  inactive with count badge inline
[-]           →  collapse control
[+]           →  expand control (collapsed state)
```

Button anatomy:
```css
background: none;
border: none;
font-family: inherit;
font-size: 11px;
padding: 2px 4px;
color: #e0e0e0;
cursor: pointer;
letter-spacing: 0.02em;
```

Active state: `color: #00ff88`.  
Never use filled backgrounds on buttons in the default state.

Every new interactive control must provide clear, immediate feedback:
- hover and active visual states
- success/error feedback for actions that persist, copy, clear, or restore data
- visible disabled/loading states when actions are in progress

---

## Panels (Console, etc.)

Panels share the same dark treatment as the toolbar bar:

```css
background: rgba(0, 0, 0, 0.88);
border: 1px solid rgba(255, 255, 255, 0.15);
font-family: 'Courier New', Courier, monospace;
font-size: 12px;
color: #e0e0e0;
```

Panel header: a single-line HUD bar using the same `[LABEL]` button pattern as the toolbar.  
No card-style headers, no gradients, no icons — text only.

---

## Animation

**Expand sequence** (toolbar opening):
1. A 1px horizontal line animates from `clip-path: inset(0 50% 0 50%)` → `inset(0 0 0 0)` over `150ms ease-out`.
2. Buttons animate in with `opacity: 0 → 1` + `translateY(-4px → 0)` over `120ms ease-out`, staggered by `30ms` per item from the center outward.

```css
@keyframes hudLineGrow {
  0%   { clip-path: inset(0 50% 0 50%); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes hudItemIn {
  0%   { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

**No other animations** in the injected UI. No transitions on colors, no spring physics, no easing on layout changes.

---

## Overlay Elements (Guides, Info)

Overlay elements (guide boxes, distance lines, info outlines) live in the host page's DOM and use a separate style sheet injected at `document.head`. They do **not** share the toolbar's shadow root.

| Element | Style |
|---------|-------|
| Guide box border | `2px solid` (color varies per pair) |
| Default guide color | `#8b5cf6` |
| Dimension labels | Same mono font, `11px`, `0px border-radius`, `3px padding`, dark bg `#111827` |
| Distance lines | `2px solid #22c55e` (or pair color) |
| Gridlines | `1px dashed #f59e0b` (SVG) |
| Info hover outline | `2px solid #38bdf8` |
| Info pinned outline | `2px solid #22c55e` |

---

## Do Not

- Add border-radius to any injected UI element
- Use proportional fonts in the toolbar or panels
- Prefer monochrome icon affordances for inspector segmented controls; keep icon-only buttons compact and consistent with HUD colors.
- Add shadows to overlay elements (guide boxes, info outlines)
- Use Tailwind classes in newly written injected styles — use the inline CSS string pattern already established in `*-styles.ts` files and `HUD_STYLES` in the toolbar
