# Vanilla Lexicon — operating rules

This directory contains the **vanilla** rebuild of the Lexicon design system. Every component here is imported component-by-component **directly from the canonical Figma file**, then translated to plain HTML + CSS using the tokens already extracted from Figma Variables.

The goal is the same as the parent project (`../prototypes/`): give designers a kit they clone and use to spin up screen mock-ups in HTML. The constraints below come from the user and are not negotiable.

---

## Hard constraints

1. **No build, no server. Ever.** Every file must work when opened with `file://` (Finder double-click, or `open vanilla/foo.html`). The user has stated multiple times that they do **not** want a localhost server. Do not call `mcp__Claude_Preview__preview_start`, do not spawn `python -m http.server`, do not use `npx serve`. To verify a render, ask the user to open the file or use the screenshot they share. (See `feedback_no_server_for_vanilla.md` in cross-session memory for context.)
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
   - `tokens-high-contrast.css` — `.hc` / `[data-theme="high-contrast"]`
   - `tokens-dark.css` — `.dark` / `[data-theme="dark"]` and `.dark-hc` / `[data-theme="dark-hc"]`

   Prototypes that don't opt in stay light. To enable skin switching on a page, include all three CSS files (after `tokens.css`) and set the class on `<html>`. The component reference (`index.html`) ships a `.picker`-based skin selector in the sidebar that toggles the class on `<html>` and persists the choice via `localStorage` under the key `vanilla-skin`. The dark and HC files contain `@media (prefers-color-scheme: dark)` / `(prefers-contrast: more)` blocks that auto-apply when no explicit skin class is set — so prototypes that include only `tokens.css` are still predictable, while pages that include all three become OS-aware unless an explicit class wins.

6. **Light mode-friendly defaults.** `tokens.css` pins `body` to white and dark text. When a skin class flips the semantic vars (e.g. `--color-white: #111116` in dark), components inherit the inversion automatically because they only ever reference tokens.

---

## Directory layout

```
vanilla/
├── CLAUDE.md                   ← this file (operating rules)
├── tokens.css                  ← Lexicon design tokens, light skin (default)
├── tokens-high-contrast.css    ← Light HC overrides on .hc / [data-theme="high-contrast"]
├── tokens-dark.css             ← Dark + Dark HC overrides on .dark / .dark-hc
├── components.css              ← all components: .btn, .alert, .picker, .table, …
├── icons.svg                   ← canonical sprite (513 Clay icons, source of truth)
├── icons.js                    ← runtime loader: inlines icons.svg into <body> on load
├── index.html                  ← single-page catalogue with sidebar skin selector
├── starter.html                ← scaffold for new prototypes (copy → edit)
├── <component>.html            ← live showcase per component (button.html, alert.html, …)
└── prototypes/                 ← designer outputs (created on demand)
```

The 36 component showcases are siblings of `index.html`. Each is reachable from the *Components imported* table (column "Notes" links to the Figma source) and from the per-component `Playground →` link in `index.html` itself.

---

## Component import workflow (Figma → vanilla)

For each new component, repeat these steps. The result is markup in `components.css` and a showcase HTML in `vanilla/<component>.html`.

### 1. Get the playground node id from Figma

Open the component's "Playground" frame in Figma, copy the URL. The node id is in the `node-id=` query param. Convert dashes to colons for the API:

```
https://www.figma.com/design/<file_key>/Lexicon-Components?node-id=473-7517
                                                                    └─→ 473:7517
```

### 2. Fetch the node data and reference image

Use the project's Figma personal access token (see *Credentials* below):

```bash
FIGMA_TOKEN='figd_…'
FILE_KEY='YNNkt9Xd6ImDtEvIz4tETF'
NODE_ID='473:7517'

# Node data (variants, props, fills, padding, layout)
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID" \
  -o /tmp/figma/<component>-node.json

# PNG render of the playground (visual ground truth)
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_ID&format=png&scale=2" \
  -o /tmp/figma/<component>-img-resp.json
# then download the URL inside that response
```

### 3. Read the structure

For each instance under the playground, dump:
- `componentProperties` — gives the variant axes (Type, Size, Validation, Rounded, Icon Only, …) and any boolean toggles. These define your CSS modifier classes.
- `absoluteBoundingBox` — gives the rendered size (height, width).
- `paddingTop/Right/Bottom/Left`, `itemSpacing` — gives the inner spacing.
- `cornerRadius` — gives the radius.
- `fills`, `strokes`, `strokeWeight` — give the colors and border weights. Each color usually has a `boundVariables` ref to a Figma Variable; for the colors we already have, the hex matches our tokens (e.g. `#EEF2FA` ↔ `var(--color-info-l2)`).

Run something like:
```js
const j = require('/tmp/figma/<comp>-node.json');
const root = j.nodes['<NODE_ID>'].document;
for (const inst of root.children) {
  console.log(inst.name, inst.componentProperties, inst.fills, inst.paddingLeft, ...);
}
```

### 4. Map Figma → tokens

Every Figma color in the response maps to a `--color-*` from `tokens.css`. The standard mapping for **validation** components is:

| Figma | Token |
|---|---|
| Background tint (e.g. `#EEF2FA`) | `var(--color-{validation}-l2)` |
| Border / accent (e.g. `#89A7E0`) | `var(--color-{validation}-l1)` |
| Text + icon (e.g. `#2E5AAC`) | `var(--color-{validation})` |

Spacing maps via `var(--spacing-N)` (1=2px, 2=4px, 2-5=6px, 3=8px, 4=12px, 5=16px, 6=20px, 7=24px, 8=32px, 9=40px, 10=48px). Radius via `var(--rounded-{sm|md|lg|full})` (2/4/8/9999). Type sizes via `var(--font-size-{xs|sm|base|md|lg|xl})` (10/12/14/16/18/20).

If a Figma value doesn't match a token, **stop and ask** — usually that means the token table needs a new entry, not that we should hard-code.

### 5. Decide the CSS API

Translate Figma variant axes to BEM-style modifier classes:

- Each *enum* variant axis becomes `.<comp>--<value>` (e.g. `Validation: Info` → `.alert--info`, `Type: Stripe` → `.alert--stripe`).
- Each *boolean* toggle becomes a separate modifier when on (e.g. `Rounded: True` → `.btn--pill`).
- Compose them by stacking — `.alert.alert--toast.alert--info` is a Toast Info alert.

When axes interact, define their cross-products with chained selectors: `.btn--primary.btn--info { background: var(--color-info); }`. Don't reach across components (`.alert .btn--primary` is wrong; `.btn--primary.btn--info` is right).

### 6. Add to `components.css` and write the showcase

- Append a clearly-delimited section to `components.css` with a header comment that links back to the Figma node id.
- Build `vanilla/<component>.html` with one example per variant from the playground. Reuse the `.showcase__row / .showcase__label` chrome.

### 7. Verify visually

Tell the user the local path (e.g. `vanilla/alert.html`) and ask them to open it. Compare against the Figma PNG side-by-side. Every variant from the playground should be present, with matching colors, padding and layout. **Do not start a server to verify** — see hard constraint #1.

### 8. Refine dependents

If the new component is used inside another (e.g. buttons live inside alerts), refactor the dependent to use the shared class instead of redefining it. The button → alert refactor is the canonical example: alerts went from `.alert--info .btn--primary { background: … }` to plain `.btn--primary.btn--info`, which keeps the button definition in one place.

---

## Skin-aware authoring rules

Anything you author or refine in `components.css` must reskin cleanly across the four skins shipped (Light, Light HC, Dark, Dark HC). The "tokens only" rule from constraint #4 is the foundation, but a few subtleties trip up refinements — these are lessons learned during the import.

**1. Avoid `--color-secondary-l0/l1/l2/l3` for text or icons.** In Light HC and Dark HC the secondary scale collapses — `-l0` through `-l3` all share the same flat colour (`#B0B0C4` in Light HC). That's fine for borders and surfaces, but it kills text contrast on near-white or near-black backgrounds.

For text/icons that must stay legible in every skin, use `var(--color-dark)` (which inverts to light text in dark skins) with `opacity` for the dimmer tone. The placeholder fix is the canonical example:

```css
/* ✗ Disappears in Light HC */
.input__field::placeholder { color: var(--color-secondary-l0); }

/* ✓ Reskins cleanly in all 4 */
.input__field::placeholder { color: var(--color-dark); opacity: 0.55; }
```

**2. `--color-white` and `--color-dark` are semantic, not literal.** In dark skins, `--color-white` becomes `#111116` (near-black) and `--color-dark` becomes `#F1F2F5` (near-white). Use them as "default surface" and "default text" — never as actual white/black. If you need a true `#FFFFFF` (e.g. inside a dark-only translucent button on dark surfaces), use the literal and add a comment explaining the exception.

**3. Validation tones flip lightness.** In light, `--color-info` is dark blue and `--color-info-l2` is a very light blue tint; in dark skins, `--color-info` is light blue and `--color-info-l2` is a dark blue tint. Components that pair `bg: var(--color-info-l2)` with `color: var(--color-info)` work in both directions automatically — no extra rules needed.

**4. Sidebar / panel backgrounds: prefer `--color-light-l1` over fallback hexes.** A common bug: `background: var(--color-light-l3, #f7f8f9)` looks fine in light skins (the literal fallback) but locks the panel to white in dark. Always use a real defined token (`--color-light-l1` is the most-light shade in every skin and inverts properly).

**5. Don't introduce literal hexes anywhere outside `tokens.css`.** Even a colour that "happens to match" a token will not flip. The kit had a brief experiment with hardcoded skin-preview swatches in the skin selector — they were reverted because they felt like a foreign body in the otherwise token-driven kit. If you need a stable colour, add it to `tokens.css` (and the dark/HC counterparts) instead.

---

## Refining an imported component

When a component looks off after import — wrong colour in a specific skin, padding mismatch, missing hover, etc. — the refinement loop is:

1. **Re-fetch the canonical render.** Grab the Figma node id from the *Components imported* table at the top of `components.css` and re-pull the PNG via `curl` (the credentials and URL pattern are documented above). Compare the saved render against the live `<component>.html` playground in the browser. Eyeballing from memory drifts over time.

2. **Pick the right scope to fix:**

   - **Wrong colour, spacing, or border** → fix the `var(--…)` reference in the `components.css` block. Affects every consumer of the class.
   - **Wrong markup** → update both `components.css` (selector / spec comment) and the showcase HTML.
   - **Fix only applies to one consumer** → scope it with a wrapper class, don't mutate the primitive. Example: the skin selector wanted uniform options without the active fill that comes from `.picker .dropdown__item.is-active`. Instead of removing the rule globally (which would change every Picker showcase), we scoped:

     ```css
     .ref__skin .dropdown__item.is-active {
       background: transparent;
       color: inherit;
       font-weight: inherit;
     }
     ```

   - **Token table is missing a value** (Figma uses a colour or size that isn't in `tokens.css`) → add it to `tokens.css` *and* propagate the equivalent to `tokens-high-contrast.css` + `tokens-dark.css`. Don't paper over with a literal.

3. **Eyeball every dependent.** Composition is real — a button tweak ripples into Alert, Modal, Dropdown, Picker, Multi Select, Table, etc. The *Notes* column in the *Components imported* table flags compositions, and the showcase HTML for each consumer is the fastest sanity check.

4. **Re-cycle a skin pass.** After any `components.css` edit, open `index.html` and click through the four skins. Anything that fails the contrast or structure check needs a skin-aware fix — see the rules above.

---

## Components imported

| Component | Figma node id | Notes |
|---|---|---|
| Button | [`473:7517`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=473-7517) | Type / Tone / Size / Shape / Icon-only / State |
| Alert | [`457:5325`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=457-5325) | Type / Layout / Validation. Close button is a shared `.btn--borderless.btn--sm.btn--icon`. |
| Badge | [`7875:315`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=7875-315) | Type only (primary/secondary/info/success/warning/danger). Pill, 16px tall, 10px/700 text. Translucent + dark-mode variants skipped (kit is light only). |
| Checkbox | [`493:12886`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=493-12886) | `.checkbox` wrapper, hidden native `<input>`, visual `.checkbox__box` (16×16) with `#check-small` + `#hr` icons. 24×24 circular focus ring (Lexicon spec) via `::before`. Indeterminate is `.is-indeterminate` on the wrapper. Localization-default-tag skipped. |
| Label | [`800:19590`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-19590) | Type / Size / Bold (filled) / Closeable / Sticker. Regular = 24px (12/18 600), Small = 16px (10/15 600 uppercase). Sticker is a free 16×16 slot until the Sticker component is imported. Close button is the local `.label__close` (16×16, transparent) — separate from `.btn` because Lexicon button sizes start at 24×24. |
| Section | [`545:520`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=545-520) | Size (Regular default = 14/21, Small = 12/18) / Type (Section vs Collapsable). Underlined heading separator: `padding: 6px 0`, `border-bottom: 1px solid var(--color-secondary-l2)`, uppercase title in `--color-secondary`. Collapsable = adds trailing `#angle-right` icon and is rendered as `<a class="section section--link">`. |
| Tooltip | [`800:20044`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20044) | Dark pill with triangular arrow. Placement: bottom (default) / `--top`. Arrow alignment: center / `--align-start` / `--align-end`. |
| Keys | [`1039:28790`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1039-28790) | Two sizes (regular 24px / `--sm` 20px) and two types (auto-width / `--fixed` square). Rendered as `<kbd class="key">`. |
| Loading Indicator | [`1574:29024`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-29024) | Clay-aligned API ([reference](https://www.clayui.com/docs/components/loading-indicator/markup)): `.loading-animation` is a circle ring spinner (3 sides washed at 25% via `color-mix`, top quadrant full `currentColor`, rotating 360°) + optional `.loading-animation-squares`. Sizes `-xs/-sm/-md/-lg`, colours `-primary/-secondary/-light`. Always `aria-hidden="true"`. |
| Progress Bar | [`538:21604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=538-21604) | 8px tall track. States: loading (partial fill), `--striped` (animated diagonal), `--completed` (green + check icon). |
| Radio | [`796:16477`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-16477) | Sibling of Checkbox; shared 24×24 circular focus ring. Checked = 4px primary inner ring. |
| Toggle Switch | [`796:14965`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-14965) | Two sizes (regular 48×24, `--sm` 30×16). Optional icon inside `.toggle__dot`, visible only when checked. |
| Slider | [`550:4359`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=550-4359) | Native `<input type="range">` styled to match Lexicon. Wrap the input in `.slider__field` (anchor for the tooltip's absolute positioning). The fill follows `--value` on the outer `.slider`. Tooltip math is thumb-center-aware: `12px + (100% − 24px) × value/100`. |
| Sticker | [`996:11505`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=996-11505) | Three types (image, `--outline` initials, `--icon`) × four sizes (`--sm/--md/--lg`) × shape (rounded square / `--circle`). Six tones for outline initials. |
| Input | [`733:14906`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=733-14906) | Heights: regular 40px / `.input--sm` 32px. Border `1px solid var(--color-secondary-l3)`. Wrapping `.input` carries label, help, feedback. Validation tones (`--warning/--danger/--success`) tint the field. Textarea via `.input__field--textarea`. Liferay-specific localization markers (lang flag, "Text to localize") not included. |
| Search | [`773:5914`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-5914) | Reuses `.input__field` + trailing magnifier (`.search__submit`) and optional `.search__clear`. Clear is `hidden` when empty (small JS in playground toggles it). |
| Input Group | [`6502:81849`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=6502-81849) | Wraps `.input__field` with leading/trailing `.input-group__addon` (plain text or `.btn`). Size flows from the group itself: `.input-group` = 40px (default, matches regular field), `.input-group--sm` = 32px (forces field + nested `.btn` to small). Don't mix `.btn--sm` with a regular group — the group is the single source of truth. Validation tones flow from the surrounding `.input`. |
| Button Group | [`477:10707`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-10707) | Segmented control + split button. `.is-active` on the selected segment. Composes any `.btn` flavour. |
| Button Translucent | [`477:11087`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-11087) | Pill button for dark surfaces. Subtle white tint by default; tone modifiers (`--info/--success/--warning/--danger`) tint the fill. Optional `.indicator` 16×16 status dot. |
| Breadcrumb | [`473:4340`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=473-4340) | `<ol class="breadcrumb">` of `<li>`. Use `aria-current="page"` on the last item. Truncate by leading with `<svg><use href="#angle-double-right">`. |
| Tabs | [`1008:17763`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1008-17763) | Horizontal row over a baseline. Active tab gets a white card via `.is-active`. Designed to sit on a light gray surface. |
| Pagination | [`532:2847`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=532-2847) | Page-size selector + summary + page list with prev/next chevrons. `--stacked` rearranges to a centred 3-row layout. Use `aria-current="page"` on the active page. |
| Empty State | [`1574:19191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-19191) | Tinted circular `.empty-state__media` + title + text + optional CTA. `--sm` for the compact form. |
| Card | [`675:4191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=675-4191) | Default = `.card__media` + `.card__body`. Variants: `--centered` (icon card), `--inline` (list-row). `.is-selected` turns the border primary. Composes Sticker, Label, Checkbox. |
| Form Sheet | [`773:6604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-6604) | White card with `.sheet-header` (title + text), content rows (single column or wrap two children in `.sheet-row` for the 2-Column variant), and optional `.sheet-footer` of buttons. Padding 24, gap 48 between top-level sections; header inner gap 24. Title uses the new `--font-size-xl` (20px) token. |
| List | [`1570:7647`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1570-7647) | `<ul class="list">` of `.list__row` separated by 1px borders, with optional `.list__header` (uppercase, 12/700, light-l1 fill). Row composes `.list__select` (checkbox), `.list__sticker` (32×32), `.list__content` (title/subtitle/detail/labels) and `.list__actions` (right-aligned `.btn--borderless.btn--sm.btn--icon` cluster). States: default, `.is-active` (primary-l3 tint), `.has-notification` (2px primary-l1 left rail via `::before`). |
| Popover | [`800:20734`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20734) | White card, padding 12/16, rounded 4, drop shadow. Optional `.popover__header` (title + close button) with bottom border, body paragraph (`.popover__body`) or arbitrary content. Sibling of Tooltip but for richer content; arrow placement modifiers mirror Tooltip. Add `.popover__body--scrollable` to cap body height with overflow. |
| Dropdown | [`1410:23811`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-23811) | `<ul class="dropdown">` of `<li><button class="dropdown__item">` rows. Optional `.dropdown__group-title` (uppercase 12/700), `.dropdown__divider` separators, `.dropdown__item-icon` (left) and `.dropdown__item-meta` (right). Optional `.dropdown__footer` with caption + button. White card, rounded 4, drop shadow. Composes Alert at the top for inline messages. |
| Modal | [`472:4478`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=472-4478) | Centred dialog over `.modal-overlay` (rgba dark). White card up to 600px wide. `.modal__header` (16/24, title + close), `.modal__body` (24 padding, scrollable), `.modal__footer` (16/24, gap 16, right-aligned buttons). Validation variants `--info/--success/--warning/--danger` tint only the header bg + title colour. |
| Side Panel | [`4664:8242`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=4664-8242) | Right-anchored drawer. Default 280px wide, `.side-panel--lg` = 480px. `.side-panel__header` (8/16/8/24, title + close), `.side-panel__body` (24 padding, scrollable), `.side-panel__footer` (16/24, top border, right-aligned buttons). Use as `<aside role="dialog" aria-modal="true">` over the page or pinned inside a layout column. |
| Picker | [`5982:705`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5982-705) | `.picker` wrapper composes a `.btn--secondary.picker__trigger` (text + trailing `#caret-double-l`) and a `.dropdown` menu. Selected option = `.dropdown__item.is-active` + leading `#check` icon. Inside `.picker`, the active item gets a `--color-primary-l3` soft fill. |
| Autocomplete | [`5906:610`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5906-610) | `.input` wrapper + `.autocomplete` field with trailing `#caret-double-l`, plus `.dropdown.autocomplete__menu` for the filtered results. Editable text in the trigger (vs Picker's read-only label). |
| Language Picker | [`5034:5991`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5034-5991) | Picker variant: trigger and items show `.lang-picker__flag` (16×12 placeholder) + locale code + status badge (`.label--sm.label--primary` for Default, `--success` for Translated, `--warning` for Not translated). Reuses `.picker` + `.dropdown` for chrome. |
| Multi Select | [`1047:29598`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-29598) | `.multi-select` is the input shell that contains inline `.label--sm` chips, a free-text `.multi-select__input`, and a trailing `.multi-select__clear`. `.multi-select__menu` reuses `.dropdown`. Validation tones flow from the wrapping `.input` (`--warning/--danger/--success`). |
| Time Picker | [`1047:30482`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-30482) | `.time-picker` row: leading `#clock` icon (outside the field) + `.time-picker__field` (HH:MM input) with optional inline `.time-picker__clear` + `.time-picker__spinner` (caret-up/down stack inside a pill border) + trailing `.time-picker__tz` for the timezone. Composes the `.input` wrapper. |
| Color Picker | [`1574:27614`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-27614) | Two surfaces: `.color-picker` (palette panel — 24×24 swatches in 6-col grid, optional Custom Colors row, optional advanced editor with hue/SV/alpha rails + R/G/B/A `.color-picker__channel` chips + hex input) and `.color-input` (compact form control with leading swatch + `#`-prefixed hex field). |
| Date Picker | [`1574:18443`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-18443) | Trigger: `.input` wrapper + `.input-group` with leading `#calendar` icon. Panel: `.date-picker-panel` with `__header` (month/year selectors + prev/today/next actions), `__weekdays` row, 7-col `__grid` of `.date-picker-panel__day` cells (32×32, rounded-full), and an optional `__time` row. Day states: default, `--muted` (out of month), `.is-selected`, `.is-in-range`, `.is-range-start`, `.is-range-end`. |
| Dual Listbox | [`1397:19158`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1397-19158) | Two side-by-side `.dual-listbox__list` panels with a centred `.dual-listbox__moves` cluster (caret-right / caret-left) and an absolute `.dual-listbox__reorder` (caret-top / caret-bottom) inside the right list. Items use `.dual-listbox__item` (default secondary text; `.is-active` = primary fill + white text). `.is-focused` on the list adds a primary-l3 background + focus ring. |
| Tree View | [`1410:25688`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-25688) | `<ul class="tree" role="tree">` of `<li role="treeitem">`. Each row is `.tree__row` with `.tree__toggle` (caret-right collapsed / caret-bottom expanded), `.tree__icon` (folder), `.tree__label`. Children nest in `<ul role="group">` indented 24px. Use `.tree__toggle--placeholder` for leaf rows to keep alignment. |
| Multi Step Navigation | [`1410:22318`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-22318) | `<ol class="stepper">` of `.stepper__step` with optional `.stepper__label` + 32×32 `.stepper__circle`. State classes on the step: `.is-complete` (dark filled circle, dark connector to next) and `.is-active` (primary circle); pending = no class (light circle). Connector is a 4px line drawn via `::after`. |
| Navigation Bar | [`478:8481`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=478-8481) | `<nav class="navbar"><ul class="navbar__list"><li>` of `.navbar__item` (links/buttons). `.is-active` (primary-l1 underline + bold dark text), `.is-focused` (primary outline ring), `.is-disabled` (light gray). Trailing `.navbar__more` is a regular `.navbar__item` with `#caret-double-l`. |
| Vertical Navigation | [`512:5857`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=512-5857) | Sidebar nav. `.vert-nav__list` (top) + `.vert-nav__sublist` (16px indent for nested children). Items: `.vert-nav__section` (uppercase title, optional trailing chevron / plus), `.vert-nav__item` (with optional leading `.vert-nav__icon` and trailing chevron / `#angle-right` for actions). `.is-active` adds primary-l3 fill + 2px primary-l1 left rail (via `::before`). `.is-muted` for inactive secondary items. |
| Vertical Bar | [`1571:15114`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1571-15114) | Narrow icon-only sidebar (40px wide) inside a white card with secondary-l3 border. `.vert-bar__cluster` groups buttons with a top divider; `--end` pins to the bottom (`margin-top: auto`). Each `.vert-bar__btn` is a 40×40 borderless button; `.is-active` adds primary-l3 fill + 2px primary-l1 left rail. |
| Table | [`1844:20952`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1844-20952) | Standard `<table class="table">`. Header row + zebra-striped body rows (`even` rows = light-l1 fill). `.is-selected` on a row tints with primary-l3 (overrides zebra). `.table__cell--gutter` is the 48px column for checkboxes / actions. Title cell composes `.table__title-wrap` with `.table__icon` (24×24 folder) + `.table__title` (underlined link). Multi-line text and stacked labels use a `.table__stack` flex column. Composes Checkbox, Label and the borderless icon button for the row menu. |

When you import a new component, append a row here.

### Button — quick reference

```html
<!-- Default primary -->
<button class="btn btn--primary">Action</button>

<!-- Primary with icon -->
<button class="btn btn--primary">
  <svg class="lexicon-icon"><use href="#plus"></use></svg>
  Action
</button>

<!-- Icon-only (square, width = height) -->
<button class="btn btn--secondary btn--icon" aria-label="Add">
  <svg class="lexicon-icon"><use href="#plus"></use></svg>
</button>

<!-- Pill -->
<button class="btn btn--primary btn--pill btn--xs">Action</button>

<!-- Tone (validation-coloured fill) -->
<button class="btn btn--primary btn--success">Action</button>

<!-- Sizes: btn--xs (24), btn--sm (32), default (40), btn--lg (48) -->
```

Modifier axes:
- **Type:** `btn--primary` · `btn--secondary` · `btn--borderless` · `btn--link`
- **Tone (filled fill / outlined border):** `btn--info` · `btn--success` · `btn--warning` · `btn--danger` (compose with `btn--primary` or `btn--secondary` or `btn--borderless`)
- **Size:** `btn--xs` · `btn--sm` · (regular) · `btn--lg`
- **Shape:** `btn--pill`
- **Icon mode:** `btn--icon` (square)

### Alert — quick reference

DOM (this nesting matters: outer flex has `gap: 16` between sections, the `.alert__content` has `gap: 8` between icon and text — that's how Figma is structured):

```html
<div class="alert alert--toast alert--info">
  <div class="alert__content">
    <svg class="lexicon-icon"><use href="#info-circle"></use></svg>
    <p class="alert__text"><strong>Info:</strong> Your message here.</p>
  </div>
  <div class="alert__actions">  <!-- optional -->
    <button class="btn btn--primary btn--info btn--sm">Action</button>
    <button class="btn btn--secondary btn--info btn--sm">Action</button>
  </div>
  <button class="btn btn--borderless btn--sm btn--icon alert__close" aria-label="Close">
    <svg class="lexicon-icon"><use href="#times"></use></svg>
  </button>
</div>
```

Modifier axes:
- **Type:** `alert--simple` (no container) · (default `embedded` — full border + radius) · `alert--stripe` (only bottom border, no radius) · `alert--toast` (border + drop shadow)
- **Layout:** (default `inline` — actions next to text) · `alert--vertical` (actions wrap to a second row, indented to the text column)
- **Validation:** `alert--info` · `alert--success` · `alert--warning` · `alert--danger`

Validation icons (always Lexicon, always 16px / `.lexicon-icon`):
- info → `#info-circle`
- success → `#check-circle-full`
- warning → `#warning-full`
- danger / error → `#times-circle-full`
- close → `#times`

Buttons inside an alert use the matching tone (`btn--primary.btn--info` for filled, `btn--secondary.btn--info` for outlined). Don't reach with `.alert--info .btn--primary { … }` — that's an old pattern we deliberately moved away from.

### Label — quick reference

```html
<!-- Outline (default) -->
<span class="label label--info">Label text</span>

<!-- Bold (filled) -->
<span class="label label--bold label--info">Label text</span>

<!-- Small — uppercased, 16px tall -->
<span class="label label--sm label--secondary">Label text</span>

<!-- With leading sticker (any 16×16 element) and close button -->
<span class="label label--bold label--secondary">
  <svg class="lexicon-icon"><use href="#picture"></use></svg>
  Label text
  <button class="label__close" aria-label="Remove">
    <svg class="lexicon-icon"><use href="#times-small"></use></svg>
  </button>
</span>
```

Modifier axes:
- **Type:** `label--secondary` · `label--primary` · `label--info` · `label--success` · `label--warning` · `label--danger`
- **Size:** (regular = 24px) · `label--sm` (16px, uppercase)
- **Weight:** (outline) · `label--bold` (filled tone bg + white text)
- **Sticker:** any 16×16 leading element (`<svg class="lexicon-icon">`, `<img>`)
- **Close:** `<button class="label__close">` with `#times-small` icon

The close button is `.label__close` and *not* `.btn`: the Lexicon button scale starts at 24×24 (`btn--xs`), which is too tall for a Small (16px) label. `.label__close` is a slim 16×16 transparent affordance that inherits the label's tone color.

### Section — quick reference

```html
<!-- Regular (default) — non-interactive header -->
<header class="section">
  <h2 class="section__title">Section Regular</h2>
</header>

<!-- Regular Collapsable — header doubles as a disclosure / link -->
<a href="#" class="section section--link">
  <h2 class="section__title">Section Regular</h2>
  <svg class="lexicon-icon"><use href="#angle-right"></use></svg>
</a>

<!-- Small — same axes, 12/18 instead of 14/21 -->
<header class="section section--sm">
  <h2 class="section__title">Section Regular</h2>
</header>
```

Modifier axes:
- **Size:** (regular = 14/21) · `section--sm` (12/18)
- **Type:** (default `Section` — header only) · `section--link` (Collapsable: render as `<a>`, append `#angle-right`)

The trailing chevron icon is a plain `.lexicon-icon` (16×16) inside the `<a class="section section--link">`. The `.section--link:hover` darkens both title and chevron together. Heights come purely from `padding: 6px 0` (`--spacing-2-5`) plus the 1.5 line-height — keep it that way; don't set explicit heights.

---

## Credentials

- **File key:** `YNNkt9Xd6ImDtEvIz4tETF` *(public — visible in any Figma share URL)*
- **Personal access token:** not stored in this repo — you must supply your own (see below)

### Getting a Figma personal access token

1. Open Figma → top-left menu → **Help and account** → **Account settings**
2. Scroll to **Personal access tokens** → **Generate new token**
3. Give it a name (e.g. `lexicon-vanilla`) and copy the value — it starts with `figd_`

### Making the token available to Claude Code

The import workflow uses the token in `curl` commands. The cleanest way is a shell environment variable in your profile so it is never typed into a file:

```bash
# ~/.zshrc or ~/.bashrc
export FIGMA_TOKEN='figd_your_token_here'
```

Alternatively, store it as a Claude Code secret:

```bash
claude secrets set FIGMA_TOKEN figd_your_token_here
```

Then the import curl commands work as written in the *Component import workflow* section — they reference `$FIGMA_TOKEN`, not a hardcoded value.

> **Never** paste the token value directly into `CLAUDE.md`, a prototype file, a commit message, or a chat message. GitHub Push Protection will block the push and the token should be rotated immediately if accidentally exposed.

The Figma Dev Mode MCP Server (`mcp__Figma__*`) requires the Figma desktop app and is **not** how we extract this kit — those tools fail with `Enable the Dev Mode MCP Server` until the desktop app is running. We use the **REST API** with the token above instead.

---

## Prototyping workflow

Goal: a designer clones this directory, opens Claude Code, and asks for screens that snap together using the imported components.

1. Copy `starter.html` to `prototypes/<kebab-case-slug>.html`.
2. Edit only inside the marked region. Keep the three `<link>`/`<script>` lines at the top intact.
3. Use existing component classes (`button.html`, `alert.html` are the catalogues).
4. Need an icon? Grep `icons.svg` for `<symbol id="<keyword>"` and reference it as `<svg class="lexicon-icon"><use href="#name"></use></svg>`.
5. Open the file in a browser — `file://` works without a server.

When the user asks for a new screen, follow the same pattern. Never:
- Inline custom SVG paths (always `<use>` from the sprite).
- Add new CSS to the prototype itself (always extend `components.css` if a primitive is missing — but ask first; usually the missing thing is a new component to import from Figma).
- Hard-code colors or spacing.

---

## Status

**Component import: complete.** All 36 components from the Lexicon Figma file have been imported (Tier 1 atomic primitives, Tier 2 direct compositions, Tier 3 surfaces / overlays, Tier 4 heavy compositions). The kit also ships four colour skins (Light, Light HC, Dark, Dark HC) — see *Hard constraints* #5 and the *Skin selector — implementation reference* section at the bottom of this file.

What remains is **refinement** rather than import: tightening any visual mismatch with Figma, polishing skin behaviour, adding edge-case showcase variants, and importing new components when they ship in Figma. Use the *Component import workflow* for new components and the *Refining an imported component* loop for everything else.

Catalogue of imported components:

- ✅ **Button** (`473:7517`) — all five types, four tones, four sizes, pill, icon-only, focus, disabled.
- ✅ **Alert** (`457:5325`) — eight variant combinations matching the Figma playground; nested `.alert__content` DOM (gap 8 inside, gap 16 outside); message inherits validation colour; close button is a shared `.btn--borderless.btn--sm.btn--icon`; vertical layout uses CSS `order` so the action row wraps below while the close stays on row 1.
- ✅ **Badge** (`7875:315`) — six tones (primary/secondary/info/success/warning/danger), pill, 16px tall.
- ✅ **Checkbox** (`493:12886`) — checked/unchecked, indeterminate, focus (24×24 circular ring), disabled, optional label. Wrapper class `.checkbox` (radio + toggle will be sibling components, not a shared wrapper).
- ✅ **Label** (`800:19590`) — six tones, two sizes (24/16), outline + bold (filled), optional sticker slot (16×16), optional `.label__close` button. Sticker is a free 16×16 leading element until the dedicated Sticker component lands; the close affordance is local to Label because the smallest `.btn` (24×24) is too tall for `label--sm`.
- ✅ **Section** (`545:520`) — two sizes (Regular default = 14/21, Small = 12/18) × two types (Section vs Collapsable with trailing `#angle-right`). Border-bottom uses `--color-secondary-l2`; vertical padding uses the new `--spacing-2-5` (6px) token added to match Figma's 30/33 heights.
- ✅ **Tooltip** (`800:20044`) — dark pill, top/bottom placement, three arrow alignments. Visual chrome that Popover will inherit later.
- ✅ **Keys** (`1039:28790`) — `<kbd class="key">`, two sizes (regular 24px / `--sm` 20px) × two types (auto-width / `--fixed` square).
- ✅ **Loading Indicator** (`1574:29024`) — Clay-aligned API ([reference](https://www.clayui.com/docs/components/loading-indicator/markup)): `.loading-animation` is a circle ring spinner (matches Clay's `loading-animation-circle` keyframe — 3 sides washed at 25% via `color-mix`, top quadrant full `currentColor`, rotating 360°). Add `.loading-animation-squares` for the paired-squares animation (cards, modals). Sizes `-xs/-sm/-md/-lg`, colours `-primary/-secondary/-light`. Markup is always `<span aria-hidden="true">` — convey state via `aria-busy` on the host.
- ✅ **Progress Bar** (`538:21604`) — 8px track. States: loading (partial), `--striped` (animated diagonal), `--completed` (green + check icon).
- ✅ **Radio** (`796:16477`) — sibling of Checkbox; shares the 24×24 circular focus ring. Checked state = 4px primary inner ring.
- ✅ **Toggle Switch** (`796:14965`) — regular 48×24 / `--sm` 30×16. Optional icon inside the dot, visible only when checked.
- ✅ **Slider** (`550:4359`) — native `<input type="range">` themed via `--value` on the `.slider` wrapper. The input must be wrapped in `.slider__field` (so the optional `.slider__tooltip` can be absolutely positioned against the track only, not the `1fr auto` grid). Tooltip uses thumb-center math `12px + (100% − 24px) × value/100` so it tracks the thumb across the whole range.
- ✅ **Sticker** (`996:11505`) — image / outline-initials / icon × four sizes × rounded-square or `--circle`. Six tones for outline initials. Used inside Card avatar slots.
- ✅ **Input** (`733:14906`) — `.input` wrapper + `.input__field`. Heights: regular = 40px (default), `.input--sm .input__field` = 32px. Border `1px solid var(--color-secondary-l3)`. Validation tones tint the field + recolour the feedback row. Textarea via `.input__field--textarea`. Liferay-specific localization markers (lang flag, "Text to localize") intentionally skipped.
- ✅ **Search** (`773:5914`) — reuses `.input__field` + trailing magnifier and optional clear button (`hidden` while empty). Playground includes minimal JS to toggle clear visibility.
- ✅ **Input Group** (`6502:81849`) — size flows from the group itself: `.input-group` = 40px, `.input-group--sm` = 32px (forces both field and any nested `.btn` to small). Addon stretches via flex so it always matches; no hardcoded heights. Validation tones flow from the surrounding `.input`. Don't mix `.btn--sm` with a regular group.
- ✅ **Button Group** (`477:10707`) — segmented control + split button. `.is-active` on selected segment. Composes any `.btn` flavour.
- ✅ **Button Translucent** (`477:11087`) — pill button for dark surfaces. Tone modifiers tint the fill; optional 16×16 `.indicator` status dot.
- ✅ **Breadcrumb** (`473:4340`) — `<ol class="breadcrumb">`. `aria-current="page"` on the last item; truncate by leading with `<svg><use href="#angle-double-right">`.
- ✅ **Tabs** (`1008:17763`) — horizontal row over a baseline. Active tab gets a white card via `.is-active`. Designed to sit on a light gray surface.
- ✅ **Pagination** (`532:2847`) — page-size selector + summary + page list with prev/next chevrons. `--stacked` rearranges to a centred 3-row layout.
- ✅ **Empty State** (`1574:19191`) — tinted circular media slot + title + text + optional CTA. `--sm` for the compact form.
- ✅ **Card** (`675:4191`) — default = media + body. Variants: `--centered` (icon card), `--inline` (list-row). `.is-selected` turns the border primary. Composes Sticker, Label, Checkbox.
- ✅ **Form Sheet** (`773:6604`) — `.sheet` outer card (white, 1px `--color-secondary-l3` border, `--rounded-md`), `.sheet-header` with title (20/25 700) + text (16/24 400), 1-column children placed directly or 2-column via `.sheet-row`, optional `.sheet-footer` of buttons. Title size required adding `--font-size-xl: 20px` to tokens.css.
- ✅ **List** (`1570:7647`) — `.list` is a `<ul>` whose children are either `.list__header` (light-l1 banner row) or `.list__row` (white). Row: `.list__select` (checkbox) + `.list__sticker` (32×32) + `.list__content` (title/subtitle/detail/labels) + `.list__actions`. States: `.is-active` (primary-l3 tint) and `.has-notification` (2px primary-l1 left rail via `::before`, doesn't shift content). Quick actions are 32×32 borderless icon buttons (`.btn--sm.btn--icon`).
- ✅ **Popover** (`800:20734`) — `.popover` white card, padding 12/16, rounded 4, `--shadow-md`. Optional `.popover__header` (title + close, with bottom divider) and `.popover__body`. Body can become scrollable with `.popover__body--scrollable` (max-height 240px override). Arrow placement (`.popover__arrow` + `--top`/default) mirrors Tooltip's chrome.
- ✅ **Dropdown** (`1410:23811`) — `<ul class="dropdown">` of `<li><button class="dropdown__item">…`. Composes group titles (`.dropdown__group-title`), separators (`.dropdown__divider`), left/right icons (`.dropdown__item-icon` / `.dropdown__item-meta`), and an optional `.dropdown__footer` with caption + secondary button. Reuses `.alert--simple.alert--info` etc. for inline banners.
- ✅ **Modal** (`472:4478`) — `.modal-overlay` (rgba dark) wraps `.modal` (white card, max-width 600). Header (16/24) + body (24, scrollable) + footer (16/24, right-aligned). Validation variants `--info/--success/--warning/--danger` tint **only** the header bg and title text colour — body and buttons stay neutral. Footer composes any `.btn` flavour, including tone (`btn--primary.btn--warning`) for the destructive primary.
- ✅ **Side Panel** (`4664:8242`) — `.side-panel` 280px (default) or 480 (`--lg`). Header 8/16/8/24, body 24 (scrollable, `flex: 1 1 auto`), footer 16/24 with top border. Designed for full-height drawer use (`<aside role="dialog">`); the showcase clips it to 600px just to render inline.
- ✅ **Picker** (`5982:705`) — `.picker` is just trigger + menu glue. Trigger reuses `.btn--secondary` with `.picker__trigger` (justify-between) + `#caret-double-l`. Menu is a plain `.dropdown`; the active option gets a check icon prefix and inside `.picker` `.is-active` becomes a primary-l3 soft fill rather than just primary text — that's the only Picker-specific override.
- ✅ **Autocomplete** (`5906:610`) — `.input` wrapper + `.autocomplete` (relatively-positioned div) holding `.input__field.autocomplete__field` (right-padded for the caret) + `.autocomplete__caret` (absolute trailing icon). Filtered list is a plain `.dropdown.autocomplete__menu`. Editable trigger; otherwise the same chrome as Picker.
- ✅ **Language Picker** (`5034:5991`) — Picker + Dropdown with two role slots inside each item: a flag placeholder (`.lang-picker__flag` — 16×12 div consumers fill with their own background) and a status `.label--sm` badge. The active item still uses the soft primary-l3 fill from Picker.
- ✅ **Multi Select** (`1047:29598`) — `.multi-select` is the input chrome itself (border + 40-min-height + flex-wrap with chips), so it does NOT use `.input__field`. It contains any number of `.label--sm` chips with `.label__close`, a flex-grow `.multi-select__input` (transparent native input) and a trailing `.multi-select__clear` (X). Focus ring and validation tones come from the wrapping `.input` so the contract matches other form controls.
- ✅ **Time Picker** (`1047:30482`) — `.time-picker` is a horizontal flex row: external clock icon, `.time-picker__field` (relative wrapper containing the HH:MM `.input__field` + absolute clear button + spinner), and a trailing `.time-picker__tz` text. The spinner is a 16×24 pill (caret-top + caret-bottom stacked) — small enough to live next to a 32-tall input. Tokens only, no fixed numerals.
- ✅ **Color Picker** (`1574:27614`) — Two unrelated surfaces share one filename: `.color-picker` is a panel (256px wide, white card, shadow) with a 6-col swatch grid (24×24 swatches), an optional title row with the color-picker drop icon, an optional empty Custom Colors row, an optional advanced editor (hue/SV/alpha rails + R/G/B/A chips + hex), and `.color-input` is the compact form control (40×40 swatch button + 100px `#`-prefixed hex input). Hue/SV/alpha rails are pure CSS gradients — no JS, no canvas.
- ✅ **Date Picker** (`1574:18443`) — Trigger reuses `.input` + `.input-group` with the `#calendar` icon as a borderless `.btn--icon` addon. Panel is `.date-picker-panel` (366px white card, shadow): header has Month/Year as two `.btn--borderless.btn--sm` triggers (each followed by `#caret-double-l`) plus three icon buttons (prev / today / next); a 7-col weekday row (M T W T F S S, dark text); a 7-col day grid where every cell is a `.date-picker-panel__day` button (32×32, rounded-full). Day states stack: `--muted` (greyed out-of-month), `.is-selected` (filled circle), `.is-in-range` (squared primary-l3 fill), `.is-range-start`/`.is-range-end` (rounded ends of the range). Optional `__time` row composes Time Picker chrome inside the panel.
- ✅ **Dual Listbox** (`1397:19158`) — `.dual-listbox` is a 3-column grid (`1fr auto 1fr`). Each side has a `.dual-listbox__title` and a `.dual-listbox__list` (light-l1 fill, rounded). Items are plain rows; `.is-active` flips them to a primary fill with white text. `.dual-listbox__moves` is a vertical pair of `.btn--secondary.btn--icon.btn--sm` (caret-right / caret-left). The right list has an absolute `.dual-listbox__reorder` cluster pinned bottom-right (caret-top / caret-bottom). `.is-focused` on the list adds primary-l3 fill + focus ring.
- ✅ **Tree View** (`1410:25688`) — `.tree` is a flat `<ul role="tree">`; nested children sit in another `<ul role="group">` inside the same `<li>`, with 24px (`--spacing-7`) left padding. Each row is `.tree__row` containing a 16×16 `.tree__toggle` button (caret-right when collapsed, caret-bottom when expanded), `.tree__icon` folder, and `.tree__label`. Use `.tree__toggle--placeholder` (visibility: hidden) on leaves so the icon/label still align with siblings.
- ✅ **Multi Step Navigation** (`1410:22318`) — `<ol class="stepper">` is a flex row of equal-width `.stepper__step` items. Each step has an optional `.stepper__label` (above) and a 32×32 `.stepper__circle` (below). The connector line is a 4px `::after` pseudo on every non-last step, rendered behind the circle (`z-index: 0` vs circle `z-index: 1`). Connector is dark when the step is `.is-complete`, otherwise secondary-l3. Active circle is primary, complete is dark with white check, pending is light gray.
- ✅ **Navigation Bar** (`478:8481`) — `.navbar` is a white container; `.navbar__list` flexes the items horizontally. `.navbar__item` is the link/button with a transparent 2px bottom border that turns primary-l1 on `.is-active` (and the text becomes bold dark). `.is-focused` adds a `outline: 2px solid` primary-l1 with `outline-offset: -2px` (matches Figma's inner-stroke focus). `.is-disabled` swaps colour to secondary-l1 and disables pointer events. The trailing dropdown trigger is just a `.navbar__item.navbar__more` with `#caret-double-l`.
- ✅ **Vertical Navigation** (`512:5857`) — `.vert-nav` is a 240-wide column. `.vert-nav__section` rows are uppercase 12/700 muted titles with optional trailing icon (chevron / plus / etc.). `.vert-nav__item` rows are 14/600 dark text with optional leading `.vert-nav__icon` and an auto-`margin-left` trailing icon. `.is-active` adds primary-l3 fill, bold weight and a 2px primary-l1 left rail (via `::before`). `.is-muted` greys out inactive secondary items. Children sit in a `.vert-nav__sublist` with 16px left padding so nesting visually steps in.
- ✅ **Vertical Bar** (`1571:15114`) — `.vert-bar` is a 40-wide white card with secondary-l3 border. `.vert-bar__cluster` groups buttons; clusters separate with a top border. `--end` cluster has `margin-top: auto` so it pins to the bottom regardless of overall bar height. `.vert-bar__btn` is a 40×40 borderless button that on `.is-active` gets primary-l3 fill + 2px primary-l1 left rail (via `::before`). Buttons accept either an SVG icon or short text glyphs (e.g. `h1`, `Tt`).
- ✅ **Table** (`1844:20952`) — `<table class="table">` with a 1px secondary-l3 border + rounded-md container. Cells use 16px vertical/horizontal padding and a 1px secondary-l3 row border. Body rows zebra-stripe via `:nth-child(even) → light-l1`; `.is-selected` overrides both zebra and white with primary-l3. `.table__cell--gutter` is the 48px column for the checkbox header and the trailing actions menu. Title cell composes `.table__title-wrap` (flex with 24×24 `.table__icon` folder + `.table__title` underlined link). For multi-status cells, use `.table__stack` to stack `.label--sm` chips vertically. Composes Checkbox + Label + borderless icon button (for the per-row `#ellipsis-v` menu).

### Pending — import roadmap

Listed bottom-up: each tier builds on the previous. Inside a tier, order is by typical usage frequency in prototypes. Pick the next item, run the eight-step workflow, append the result to the *Components imported* table, and tick it off here.

Every link below points at the **Playground Container** node (the inner frame with the actual variants). The outer "Playground Section" lives one parent up if you ever need the whole section image.

#### Tier 1 — atomic primitives (no dependencies on other unimported components)

- [x] ~~**Label** — [`800:19590`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-19590)~~ — done.
- [x] ~~**Loading Indicator** — [`1574:29024`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-29024)~~ — done.
- [x] ~~**Progress Bar** — [`538:21604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=538-21604)~~ — done.
- [x] ~~**Tooltip** — [`800:20044`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20044)~~ — done.
- [x] ~~**Keys** — [`1039:28790`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1039-28790)~~ — done.
- [x] ~~**Radio Button** — [`796:16477`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-16477)~~ — done.
- [x] ~~**Toggle Switch** — [`796:14965`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=796-14965)~~ — done.
- [x] ~~**Slider** — [`550:4359`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=550-4359)~~ — done.
- [x] ~~**Sticker** — [`996:11505`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=996-11505)~~ — done.
- [x] ~~**Input: Text** — [`733:14906`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=733-14906)~~ — done.

#### Tier 2 — direct compositions of Tier 1 + already-imported

- [x] ~~**Input: Search** — [`773:5914`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-5914)~~ — done.
- [x] ~~**Input: Group** — [`6502:81849`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=6502-81849)~~ — done.
- [x] ~~**Button Group** — [`477:10707`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-10707)~~ — done.
- [x] ~~**Button Translucent** — [`477:11087`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=477-11087)~~ — done.
- [x] ~~**Breadcrumb** — [`473:4340`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=473-4340)~~ — done.
- [x] ~~**Tab** — [`1008:17763`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1008-17763)~~ — done.
- [x] ~~**Pagination** — [`532:2847`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=532-2847)~~ — done.
- [x] ~~**Empty State** — [`1574:19191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-19191)~~ — done.

#### Tier 3 — surfaces and overlays

- [x] ~~**Card** — [`675:4191`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=675-4191)~~ — done.
- [x] ~~**Section** — [`545:520`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=545-520)~~ — done.
- [x] ~~**Form Sheet** — [`773:6604`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=773-6604)~~ — done.
- [x] ~~**List** — [`1570:7647`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1570-7647)~~ — done.
- [x] ~~**Popover** — [`800:20734`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=800-20734)~~ — done.
- [x] ~~**Dropdown** — [`1410:23811`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-23811)~~ — done.
- [x] ~~**Modal** — [`472:4478`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=472-4478)~~ — done.
- [x] ~~**Side Panel** — [`4664:8242`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=4664-8242)~~ — done.

#### Tier 4 — heavy compositions

- [x] ~~**Date Picker** — [`1574:18443`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-18443)~~ — done.
- [x] ~~**Time Picker** — [`1047:30482`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-30482)~~ — done.
- [x] ~~**Color Picker** — [`1574:27614`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1574-27614)~~ — done.
- [x] ~~**Picker** — [`5982:705`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5982-705)~~ — done.
- [x] ~~**Language Picker** — [`5034:5991`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5034-5991)~~ — done.
- [x] ~~**Autocomplete** — [`5906:610`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=5906-610)~~ — done.
- [x] ~~**Multi Select** — [`1047:29598`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1047-29598)~~ — done.
- [x] ~~**Dual Listbox** — [`1397:19158`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1397-19158)~~ — done.
- [x] ~~**Tree View** — [`1410:25688`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-25688)~~ — done.
- [x] ~~**Multi Step Navigation** — [`1410:22318`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1410-22318)~~ — done.
- [x] ~~**Navigation Bar** — [`478:8481`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=478-8481)~~ — done.
- [x] ~~**Vertical Navigation** — [`512:5857`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=512-5857)~~ — done.
- [x] ~~**Vertical Bar** — [`1571:15114`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1571-15114)~~ — done.
- [x] ~~**Table** — [`1844:20952`](https://www.figma.com/design/YNNkt9Xd6ImDtEvIz4tETF/Lexicon-Components?node-id=1844-20952)~~ — done.

> ⚠️ Some pages have multiple Playground Containers (Keys, Loading Indicator, Navigation Bar, Tooltip, Tree View, Vertical Bar). The link above is the primary one — check sibling containers when importing for extra variants/sub-groups.

For new Figma components that ship later, get the Playground node-id, run the eight-step import workflow above, and append the result to the *Components imported* table.

---

## Skin selector — implementation reference

The four skins (Light, Light HC, Dark, Dark HC) are activated by toggling a class on `<html>`. The component reference page (`index.html`) ships a working selector built entirely from existing primitives — copy it into any prototype that needs skin switching.

### File loading order

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="tokens-high-contrast.css">
<link rel="stylesheet" href="tokens-dark.css">
<link rel="stylesheet" href="components.css">
<script src="icons.js"></script>
```

`tokens.css` defines the default light skin on `:root`. The two skin files override only when their class is present on `<html>` (or via `[data-theme="…"]` attributes — kept for compatibility with the upstream Figma export, but we use classes everywhere). Both skin files include `@media (prefers-color-scheme: dark)` / `(prefers-contrast: more)` blocks that auto-apply when no explicit class is set on `<html>` — fine for prototypes that don't need a switcher; the explicit class wins for those that do.

### Class names

Active class on `<html>` → active skin:

| Class       | Skin                |
|-------------|---------------------|
| (none) or `.light` | Light (default)     |
| `.hc`       | Light high contrast |
| `.dark`     | Dark                |
| `.dark-hc`  | Dark high contrast  |

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
    <li><button type="button" class="dropdown__item" role="option" data-skin="hc">
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

### Wrapper styles

The selector wraps `.picker` so the dropdown floats over the page rather than pushing content down:

```css
.my-skin-selector { position: relative; width: 100%; }
.my-skin-selector .picker__trigger { width: 100%; }
.my-skin-selector .dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  z-index: 10;
}
.my-skin-selector:not(.is-open) .dropdown { display: none; }

/* Uniform options — only the check icon marks the active one */
.my-skin-selector .dropdown__item.is-active {
  background: transparent;
  color: inherit;
  font-weight: inherit;
}
.my-skin-selector .dropdown__item:hover { background: var(--color-light); }
```

### JS pattern

The selector toggles the skin class on `<html>`, persists the choice under `localStorage` key `vanilla-skin`, closes on outside click and `Escape`, and updates the trigger label + check icon visibility on the active option. See the inline `<script>` at the bottom of `index.html` for the full implementation — copy verbatim and adjust the `.my-skin-selector` query if you renamed the wrapper.

---

### Open questions / known caveats

- **Tokens.css scope:** currently a hand-trimmed copy of the parent `tokens.css`. If we add components that need tokens we don't have (e.g. extra spacings, font weights), check whether the parent `tokens.css` already has them and copy across — don't invent.
- **Focus ring:** `--focus-ring` lives in `tokens.css`. The Button shows it via `:focus-visible`; the Alert close button inherits it because it *is* a button.
- **Skin support is opt-in.** Pages that include only `tokens.css` stay light forever (and ignore OS preferences). Pages that include all three token files become OS-aware unless an explicit class on `<html>` overrides the auto media queries. The skin selector forces an explicit class so the user's choice always wins.
- **Worktree mirroring:** the user works in `main`, not in `.claude/worktrees/*`. Edit files at the project root directly.
