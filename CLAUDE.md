# Vanilla Lexicon — operating rules

This directory contains the **vanilla** rebuild of the Lexicon design system. Every component here is imported component-by-component **directly from the canonical Figma file**, then translated to plain HTML + CSS using the tokens already extracted from Figma Variables.

The goal is the same as the parent project (`../prototypes/`): give designers a kit they clone and use to spin up screen mock-ups in HTML. The constraints below come from the user and are not negotiable.

---

## Hard constraints

1. **No build, no server. Ever.** Every file must work when opened with `file://` (Finder double-click, or `open vanilla/foo.html`). The user has stated multiple times that they do **not** want a localhost server. Do not call `mcp__Claude_Preview__preview_start`, do not spawn `python -m http.server`, do not use `npx serve`. To verify a render, ask the user to open the file or use the screenshot they share.
   - No `fetch()`, no `<use href="external.svg#…">` (browsers block both on `file://`).
   - SVG icons are loaded by `icons.js`, which inlines the sprite into the document on script execution. `<script>` tags work fine on `file://`.
   - Stylesheets are referenced with relative paths (`<link href="components.css">`), which also works on `file://`.

2. **One shared CSS.** All component styles live in a single `components.css`. No per-component `.css` files. Tokens stay separated in `tokens.css` (so prototypes can swap themes by replacing only that file). Designers always include the same three lines:
   ```html
   <link rel="stylesheet" href="tokens.css">
   <link rel="stylesheet" href="components.css">
   <script src="icons.js"></script>
   ```

3. **Lexicon icons only, at Lexicon sizes.** No hand-drawn SVG paths, no Heroicons, no emoji, no font-awesome. Reference icons by id from `icons.svg`:
   ```html
   <svg class="lexicon-icon"><use href="#plus"></use></svg>
   ```
   Sizes: `lexicon-icon-sm` (12), `lexicon-icon` (16, default), `lexicon-icon-lg` (24), `lexicon-icon-xl` (32), `lexicon-icon-2xl` (48). The full list of 513 names is `grep '<symbol id=' icons.svg`.

4. **Tokens only, no raw values.** Every color / size / radius / font-size in CSS or inline `style` must reference a `var(--…)` from `tokens.css`. No `#0B5FFF`, no `16px` literals (except inside `tokens.css` itself).

5. **Skins are class-based, opt-in.** The kit ships four skins (we call them *skins*, not *themes*):
   - `tokens.css` — light (default, applied to `:root`)
   - `tokens-high-contrast.css` — `.light-hc` / `[data-theme="light-hc"]`
   - `tokens-dark.css` — `.dark` / `[data-theme="dark"]` and `.dark-hc` / `[data-theme="dark-hc"]`

   Prototypes that don't opt in stay light. To enable skin switching on a page, include all three CSS files (after `tokens.css`) and set the class on `<html>`. The component reference (`index.html`) ships a `.picker`-based skin selector in the sidebar that toggles the class on `<html>` and persists the choice via `localStorage` under the key `vanilla-skin`. The dark and HC files contain `@media (prefers-color-scheme: dark)` / `(prefers-contrast: more)` blocks that auto-apply when no explicit skin class is set — so prototypes that include only `tokens.css` are still predictable, while pages that include all three become OS-aware unless an explicit class wins.

6. **Light mode-friendly defaults.** `tokens.css` pins `body` to white and dark text. When a skin class flips the semantic vars (e.g. `--color-white: #111116` in dark), components inherit the inversion automatically because they only ever reference tokens.

---

## Directory layout

```
vanilla/
├── CLAUDE.md                   ← this file (operating rules)
├── tokens.css                  ← Lexicon design tokens, light skin (default)
├── tokens-high-contrast.css    ← Light HC overrides on .light-hc / [data-theme="light-hc"]
├── tokens-dark.css             ← Dark + Dark HC overrides on .dark / .dark-hc
├── components.css              ← all components: .btn, .alert, .picker, .table, …
├── icons.svg                   ← canonical sprite (513 Clay icons, source of truth)
├── icons.js                    ← runtime loader: inlines icons.svg into <body> on load
├── index.html                  ← single-page catalogue with sidebar skin selector
├── colors.html                 ← full color token palette (142 tokens)
├── starter.html                ← scaffold for new prototypes (copy → edit)
├── showcases/                  ← one live showcase per component (button.html, alert.html, …)
├── illustrations/              ← decorative SVGs (satellite, spaceship, telescope)
└── prototypes/                 ← designer outputs (created on demand)
```

---

## Skin-aware authoring rules

Anything you author or refine in `components.css` must reskin cleanly across the four skins shipped (Light, Light HC, Dark, Dark HC). The "tokens only" rule from constraint #4 is the foundation, but a few subtleties trip up refinements.

**1. Avoid `--color-secondary-l0/l1/l2/l3` for text or icons.** In Light HC and Dark HC the secondary scale collapses — `-l0` through `-l3` all share the same flat colour. That's fine for borders and surfaces, but it kills text contrast on near-white or near-black backgrounds.

For text/icons that must stay legible in every skin, use `var(--color-dark)` with `opacity` for the dimmer tone:

```css
/* ✗ Disappears in Light HC */
.input__field::placeholder { color: var(--color-secondary-l0); }

/* ✓ Reskins cleanly in all 4 */
.input__field::placeholder { color: var(--color-dark); opacity: 0.55; }
```

**2. `--color-white` and `--color-dark` are semantic, not literal.** In dark skins, `--color-white` becomes `#111116` (near-black) and `--color-dark` becomes `#F1F2F5` (near-white). Use them as "default surface" and "default text" — never as actual white/black.

**3. Validation tones flip lightness.** Components that pair `bg: var(--color-info-l2)` with `color: var(--color-info)` work in both light and dark automatically — no extra rules needed.

**4. Prefer `--color-light-l1` over fallback hexes for panel backgrounds.** `background: var(--color-light-l3, #f7f8f9)` locks the panel to white in dark. Always use a real defined token.

**5. Don't introduce literal hexes anywhere outside `tokens.css`.** If you need a stable colour, add it to `tokens.css` (and the dark/HC counterparts) instead.

**6. Never use `.is-focused` in showcase HTML.** The class exists in `components.css` to let Figma-to-HTML imports render the focus ring statically (Figma has no `:focus-visible`). In a browser the real `:focus-visible` fires on keyboard navigation, so a static `.is-focused` example is redundant and misleading. Showcase files must not contain `is-focused` on any element. If a component has a meaningful interactive state that's *only* visible on focus (e.g. an input with a clear button that appears while typing), demonstrate it without the focus ring class — the state itself is the point, not the ring.

---

## Components imported

| Component | Figma node id | Notes |
|---|---|---|
| Button | [`473:7517`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=473-7517) | Type / Tone / Size / Shape / Icon-only / State |
| Alert | [`457:5325`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=457-5325) | Type / Layout / Validation. Close button is a shared `.btn--borderless.btn--sm.btn--icon`. |
| Badge | [`7875:315`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=7875-315) | Type only (primary/secondary/info/success/warning/danger). Pill, 16px tall. |
| Checkbox | [`493:12886`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=493-12886) | `.checkbox` wrapper, hidden native `<input>`, visual `.checkbox__box`. Indeterminate is `.is-indeterminate`. |
| Label | [`800:19590`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-19590) | Type / Size / Bold (filled) / Closeable / Sticker. Close button is `.label__close` (not `.btn`). |
| Section | [`545:520`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=545-520) | Size (Regular 14/21, Small 12/18) / Type (Section vs Collapsable with `#angle-right`). |
| Tooltip | [`800:20044`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20044) | Dark pill, top/bottom placement, three arrow alignments. |
| Keys | [`1039:28790`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1039-28790) | Two sizes (24px / `--sm` 20px) × two types (auto-width / `--fixed` square). `<kbd class="key">`. |
| Loading Indicator | [`1574:29024`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-29024) | `.loading-animation` = ring spinner. `.loading-animation-squares` = paired squares (standalone). Sizes `-xs/-sm/-md/-lg`, colours `-primary/-secondary/-light`. |
| Progress Bar | [`538:21604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=538-21604) | 8px track. States: loading, `--striped`, `--completed`. |
| Radio | [`796:16477`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-16477) | Sibling of Checkbox. Checked = 4px primary inner ring. |
| Toggle Switch | [`796:14965`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-14965) | Regular 48×24 / `--sm` 30×16. Optional icon inside dot, visible only when checked. |
| Slider | [`550:4359`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=550-4359) | Native `<input type="range">` themed via `--value` on `.slider`. Wrap in `.slider__field`. |
| Sticker | [`996:11505`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=996-11505) | Image / `--outline` initials / `--icon` × four sizes × rounded-square or `--circle`. |
| Input | [`733:14906`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=733-14906) | Heights: 40px / `--sm` 32px. Validation tones. Textarea via `.input__field--textarea`. |
| Search | [`773:5914`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-5914) | Reuses `.input__field` + `.search__submit` magnifier + optional `.search__clear`. |
| Input Group | [`6502:81849`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=6502-81849) | Size from group: `.input-group` = 40px, `.input-group--sm` = 32px. Don't mix `.btn--sm` with a regular group. |
| Button Group | [`477:10707`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-10707) | Segmented control + split button. `.is-active` on selected segment. |
| Button Translucent | [`477:11087`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-11087) | Pill button for dark surfaces. Optional `.indicator` 16×16 status dot. |
| Breadcrumb | [`473:4340`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=473-4340) | `<ol class="breadcrumb">`. `aria-current="page"` on last item. |
| Tabs | [`1008:17763`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1008-17763) | Horizontal row. Active tab = white card via `.is-active`. Sits on light gray surface. |
| Pagination | [`532:2847`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=532-2847) | Page-size selector + summary + page list. `--stacked` for 3-row layout. |
| Empty State | [`1574:19191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-19191) | Tinted circular media + title + text + optional CTA. `--sm` for compact form. |
| Card | [`675:4191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=675-4191) | Default / `--centered` / `--inline`. `.is-selected` turns border primary. |
| Form Sheet | [`773:6604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-6604) | `.sheet` card, `.sheet-header`, 1-col or `.sheet-row` 2-col, optional `.sheet-footer`. |
| List | [`1570:7647`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1570-7647) | `.list__row` with select / sticker / content / actions. States: `.is-active`, `.has-notification`. |
| Popover | [`800:20734`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20734) | White card, optional header + body. `.popover__body--scrollable` caps height. Arrow mirrors Tooltip. |
| Dropdown | [`1410:23811`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-23811) | `<ul class="dropdown">` of `<li><button class="dropdown__item">`. Group titles, dividers, icons, footer. |
| Modal | [`472:4478`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=472-4478) | `.modal-overlay` + `.modal` (600px max). Validation variants tint header only. |
| Side Panel | [`4664:8242`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=4664-8242) | Right drawer 280px / `--lg` 480px. Header + scrollable body + footer. |
| Picker | [`5982:705`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5982-705) | `.picker__trigger` + `.dropdown`. Active item = primary-l3 soft fill. |
| Autocomplete | [`5906:610`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5906-610) | Editable trigger (vs Picker's read-only). Filtered list = `.dropdown.autocomplete__menu`. |
| Language Picker | [`5034:5991`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5034-5991) | Picker variant with `.lang-picker__flag` + locale code + status `.label--sm`. |
| Multi Select | [`1047:29598`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-29598) | `.multi-select` shell with inline chips + free-text input + clear. Menu = `.dropdown`. |
| Time Picker | [`1047:30482`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-30482) | Clock icon + `.time-picker__field` (HH:MM + clear + spinner) + `.time-picker__tz`. |
| Color Picker | [`1574:27614`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-27614) | `.color-picker` panel (swatch grid + optional advanced editor) + `.color-input` compact control. |
| Date Picker | [`1574:18443`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-18443) | `.date-picker-panel` with header, weekday row, day grid (32×32 cells). Range states. Optional time row. |
| Dual Listbox | [`1397:19158`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1397-19158) | 3-col grid (`1fr auto 1fr`). `.dual-listbox__moves` (caret-right/left) + `.dual-listbox__reorder`. |
| Tree View | [`1410:25688`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-25688) | `<ul role="tree">` of `.tree__row` (toggle + icon + label). Children in `<ul role="group">` +24px indent. |
| Multi Step Navigation | [`1410:22318`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-22318) | `<ol class="stepper">`. States: `.is-complete` / `.is-active` / pending. Connector via `::after`. |
| Navigation Bar | [`478:8481`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=478-8481) | `.navbar__item` with `.is-active` (primary-l1 underline) / `.is-focused` / `.is-disabled`. |
| Vertical Navigation | [`512:5857`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=512-5857) | `.vert-nav__section` titles + `.vert-nav__item` rows + `.vert-nav__sublist` (16px indent). `.is-active` = primary-l3 + left rail. |
| Vertical Bar | [`1571:15114`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1571-15114) | 40px icon sidebar. `.vert-bar__cluster` groups; `--end` pins to bottom. `.is-active` = primary-l3 + left rail. |
| Table | [`1844:20952`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1844-20952) | Zebra rows. `.is-selected` = primary-l3. `.table__cell--gutter` 48px. Composes Checkbox + Label. |
| Management Toolbar *(satellite)* | [`397:297`](https://www.figma.com/design/BaksMumOL8uRzeZLAfd4Ku/Lexicon-Satellites?node-id=397-297) | `.management-toolbar` wrapper. Default: checkbox + filter/order + search + view picker + actions. Active: `.management-toolbar--active` (primary underline, selection count, bulk actions). Optional `__results` bar. Desktop + mobile responsive. |
| Control Menu *(satellite)* | [`3310:13193`](https://www.figma.com/design/BaksMumOL8uRzeZLAfd4Ku/Lexicon-Satellites?node-id=3310-13193) | `.control-menu` app top bar. Left: `.control-menu__btns` (product-menu toggle + optional back) + `.control-menu__title`. Right: global-nav icon + `.control-menu__avatar` (36px circle). Mobile uses tighter padding via `@media (max-width: 767px)`. |
| CMS Menu *(satellite)* | [`2545:4896`](https://www.figma.com/design/BaksMumOL8uRzeZLAfd4Ku/Lexicon-Satellites?node-id=2545-4896) | `.cms-menu` 280px sidebar panel (light-l1 bg + secondary-l0 right border). Groups in `.cms-menu__groups` (16px gap). Reuses `.vert-nav__item` rows and `.vert-nav__group-header` section labels. Section headers with an add action use `.vert-nav__group-actions` to wrap button + caret. Space items use `.sticker` in the icon cell (colour via inline style — user data). |
| CMS Breadcrumb *(satellite)* | [`4481:2724`](https://www.figma.com/design/BaksMumOL8uRzeZLAfd4Ku/Lexicon-Satellites?node-id=4481-2724) | `<ol class="cms-breadcrumb">`. 18px (`--font-size-lg`) semibold control-bar breadcrumb. `#slash` separator. Last item: `aria-current="page"` + `.cms-breadcrumb__action` (⋮ button). Optional `<li><span class="cms-breadcrumb__space">` sticker — colour via inline style (user data). |
| CMS Dropdown *(satellite)* | [`4481:27057`](https://www.figma.com/design/BaksMumOL8uRzeZLAfd4Ku/Lexicon-Satellites?node-id=4481-27057) | `.cms-structure-dropdown` 240px white panel. Field items in `.cms-structure-dropdown__group` (4px gap); each item is a `<button class="cms-structure-dropdown__item">` with a `.cms-structure-dropdown__sticker--field` (blue) or `--structure` (orange) 32×32 icon sticker and 12px semibold label. Divider: `.cms-structure-dropdown__divider`. Active state: `.is-active`. |
| Control Panel | [`2:2209`](https://www.figma.com/design/GYxgfX51jQhrzgChOIC37D/Product-Menus--Side-Navigation-?node-id=2-2209) | `.control-panel` 320px overlay sidebar (light-l1 bg, secondary-l0 right border). Header: `.control-panel__sticker` (40×40 white rounded box) + `.control-panel__title` + close btn. Body: `.control-panel__body` (scrollable, 24px v-padding). Groups list: `.control-panel__groups` (16px gap) → `.control-panel__group` (4px gap) → `.control-panel__group-header` (12px uppercase + chevron) + `.control-panel__item` (40px, 24px icon container). Active item: `.is-active` → primary-l3 bg + 6px primary left rail. |

For new Figma components, get the Playground node-id, fetch the node JSON + PNG via the REST API, map fills to tokens, write the CSS + showcase HTML, and append a row here.

---

## Component quick references

### Button

```html
<button class="btn btn--primary">Action</button>
<button class="btn btn--primary btn--success">Action</button>
<button class="btn btn--secondary btn--icon" aria-label="Add">
  <svg class="lexicon-icon"><use href="#plus"></use></svg>
</button>
<button class="btn btn--primary btn--pill btn--xs">Action</button>
```

- **Type:** `btn--primary` · `btn--secondary` · `btn--borderless` · `btn--link`
- **Tone:** `btn--info` · `btn--success` · `btn--warning` · `btn--danger`
- **Size:** `btn--xs` (24) · `btn--sm` (32) · default (40) · `btn--lg` (48)
- **Shape:** `btn--pill` · `btn--icon` (square)

### Alert

```html
<div class="alert alert--toast alert--info">
  <div class="alert__content">
    <svg class="lexicon-icon"><use href="#info-circle"></use></svg>
    <p class="alert__text"><strong>Info:</strong> Your message here.</p>
  </div>
  <div class="alert__actions"> <!-- optional -->
    <button class="btn btn--primary btn--info btn--sm">Action</button>
  </div>
  <button class="btn btn--borderless btn--sm btn--icon alert__close" aria-label="Close">
    <svg class="lexicon-icon"><use href="#times"></use></svg>
  </button>
</div>
```

- **Type:** `alert--simple` · default (embedded) · `alert--stripe` · `alert--toast`
- **Layout:** default (inline) · `alert--vertical`
- **Validation:** `alert--info` · `alert--success` · `alert--warning` · `alert--danger`
- **Icons:** info → `#info-circle` · success → `#check-circle-full` · warning → `#warning-full` · danger → `#times-circle-full`

### Label

```html
<span class="label label--info">Label text</span>
<span class="label label--bold label--info">Label text</span>
<span class="label label--sm label--secondary">Label text</span>
```

- **Type:** `label--secondary/primary/info/success/warning/danger`
- **Size:** default (24px) · `label--sm` (16px, uppercase)
- **Weight:** default (outline) · `label--bold` (filled)
- **Close:** `<button class="label__close">` with `#times-small` — not `.btn` (too tall for sm)

### Section

```html
<header class="section">
  <h2 class="section__title">Title</h2>
</header>

<a href="#" class="section section--link">
  <h2 class="section__title">Collapsable</h2>
  <svg class="lexicon-icon"><use href="#angle-right"></use></svg>
</a>
```

- **Size:** default (14/21) · `section--sm` (12/18)
- **Type:** default (header) · `section--link` (render as `<a>`, add `#angle-right`)

---

## Credentials

- **File key:** `YNNkt9Xd6ImDtEvIz4tETF` *(public — visible in any Figma share URL)*
- **Personal access token:** not stored in this repo — you must supply your own (see below)

### Getting a Figma personal access token

1. Open Figma → top-left menu → **Help and account** → **Account settings**
2. Scroll to **Personal access tokens** → **Generate new token**
3. Give it a name (e.g. `lexicon-vanilla`) and copy the value — it starts with `figd_`

### Making the token available to Claude Code

```bash
# ~/.zshrc or ~/.bashrc
export FIGMA_TOKEN='figd_your_token_here'
```

Or as a Claude Code secret:

```bash
claude secrets set FIGMA_TOKEN figd_your_token_here
```

Then use `$FIGMA_TOKEN` in curl commands — never paste the value into a file or chat message.

---

## Prototyping workflow

Goal: a designer clones this directory, opens Claude Code, and asks for screens that snap together using the imported components.

1. Copy `starter.html` to `prototypes/<kebab-case-slug>.html`.
2. Edit only inside the marked region. Keep the three `<link>`/`<script>` lines at the top intact.
3. Use existing component classes (`showcases/button.html`, `showcases/alert.html` are the catalogues).
4. Need an icon? Grep `icons.svg` for `<symbol id="<keyword>"` and reference it as `<svg class="lexicon-icon"><use href="#name"></use></svg>`.
5. Open the file in a browser — `file://` works without a server.

Never:
- Inline custom SVG paths (always `<use>` from the sprite).
- Add new CSS to the prototype itself (extend `components.css` if a primitive is missing).
- Hard-code colors or spacing.

---

## Built-in helper: `/create-screen`

This repo ships a Claude Code skill plus a slash command that automate the prototyping workflow above. Both are scoped to this repo (under `.claude/`) and only load when Claude Code operates inside this directory or one of its worktrees.

- **Skill** — [.claude/skills/create-screen/SKILL.md](.claude/skills/create-screen/SKILL.md). Auto-triggers when the user asks to create / draft / mock up / design a screen, page, prototype, or wireframe in English or Spanish ("crea una pantalla de…", "diseña un mock-up…", etc.).
- **Slash command** — [.claude/commands/create-screen.md](.claude/commands/create-screen.md). Explicit entry point: `/create-screen [optional description]`.

Both paths follow the same workflow defined in `SKILL.md`, which covers: clarifying only structurally ambiguous decisions (sidebar variant, skin scope, state to render), inventing realistic sample data instead of asking, copying `starter.html`, composing with existing classes only, the hard rules, and a final checklist.

**`SKILL.md` is the single source of truth — don't fork its content into the slash command file when editing.** The slash command file only points at the skill; updates to the workflow go in `SKILL.md`.

---

## Skin selector — implementation reference

The four skins are activated by toggling a class on `<html>`. Copy this pattern into any prototype that needs skin switching.

### File loading order

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="tokens-high-contrast.css">
<link rel="stylesheet" href="tokens-dark.css">
<link rel="stylesheet" href="components.css">
<script src="icons.js"></script>
```

### Skin classes

| Class | Skin |
|---|---|
| (none) or `.light` | Light (default) |
| `.light-hc` | Light high contrast |
| `.dark` | Dark |
| `.dark-hc` | Dark high contrast |

### Markup pattern

```html
<div class="picker my-skin-selector">
  <button type="button" class="btn btn--secondary btn--xs picker__trigger" id="skin-trigger" aria-haspopup="listbox" aria-expanded="false">
    <span class="picker__trigger-text">Light</span>
    <svg class="lexicon-icon lexicon-icon-sm"><use href="#caret-double-l"></use></svg>
  </button>
  <ul class="dropdown" role="listbox" aria-labelledby="skin-trigger">
    <li><button type="button" class="dropdown__item is-active" role="option" data-skin="light" aria-selected="true">
      <svg class="lexicon-icon dropdown__item-icon"><use href="#check"></use></svg> Light
    </button></li>
    <li><button type="button" class="dropdown__item" role="option" data-skin="light-hc">
      <svg class="lexicon-icon dropdown__item-icon" style="visibility:hidden"><use href="#check"></use></svg> Light high contrast
    </button></li>
    <li><button type="button" class="dropdown__item" role="option" data-skin="dark">
      <svg class="lexicon-icon dropdown__item-icon" style="visibility:hidden"><use href="#check"></use></svg> Dark
    </button></li>
    <li><button type="button" class="dropdown__item" role="option" data-skin="dark-hc">
      <svg class="lexicon-icon dropdown__item-icon" style="visibility:hidden"><use href="#check"></use></svg> Dark high contrast
    </button></li>
  </ul>
</div>
```

```css
.my-skin-selector { position: relative; width: 100%; }
.my-skin-selector .picker__trigger { width: 100%; }
.my-skin-selector .dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0; right: 0; z-index: 10;
}
.my-skin-selector:not(.is-open) .dropdown { display: none; }
.my-skin-selector .dropdown__item.is-active {
  background: transparent; color: inherit; font-weight: inherit;
}
.my-skin-selector .dropdown__item:hover { background: var(--color-light); }
```

The JS toggles the skin class on `<html>`, persists under `localStorage` key `vanilla-skin`, closes on outside click and `Escape`. See the inline `<script>` at the bottom of `index.html` — copy verbatim.

---

## CMS Style — implementation reference

`index.html` ships a second sibling toggle next to the skin selector called **CMS Style**, which overrides the rounded-corner tokens at runtime:

| Token | Default | CMS Style on |
|---|---|---|
| `--rounded-sm` | 2px | **4px** |
| `--rounded-md` | 4px | **8px** |
| `--rounded-lg` | 8px | **16px** |

The choice persists under `localStorage` key `vanilla-cms-style` (`'1'` = on, `''` or absent = off). It propagates to prototypes and showcases the same way the skin does — the head IIFE in each page reads the flag on load and applies the three `documentElement.style.setProperty` calls before any CSS runs.

### Extended IIFE (what every prototype / showcase must ship in `<head>`)

```html
<script>(function(){
  var S=['light','light-hc','dark','dark-hc'];
  function apply(){try{
    var r=document.documentElement;
    var s=localStorage.getItem('vanilla-skin')||'light';
    S.forEach(function(c){r.classList.remove(c);});
    r.classList.add(S.indexOf(s)>-1?s:'light');
    if(localStorage.getItem('vanilla-cms-style')==='1'){
      r.style.setProperty('--rounded-sm','4px');
      r.style.setProperty('--rounded-md','8px');
      r.style.setProperty('--rounded-lg','16px');
    }else{
      r.style.removeProperty('--rounded-sm');
      r.style.removeProperty('--rounded-md');
      r.style.removeProperty('--rounded-lg');
    }
  }catch(e){}}
  apply();
  window.addEventListener('pageshow',apply);
})()</script>
```

`starter.html` already includes this — any prototype copied from the scaffold inherits it. Older prototypes / showcases authored before this change need the IIFE replaced manually.

---

## Known caveats

- **Tokens.css scope:** hand-trimmed from the parent `tokens.css`. If a new component needs a missing token, check the parent first and copy across — don't invent.
- **Focus ring:** `--focus-ring` lives in `tokens.css`. Buttons show it via `:focus-visible`; elements that compose `.btn` inherit it automatically.
- **Skin support is opt-in.** Pages with only `tokens.css` stay light forever. Pages with all three token files become OS-aware unless an explicit class on `<html>` overrides.
- **Worktree mirroring:** the user works in `main`, not in `.claude/worktrees/*`. Edit files at the project root directly.
