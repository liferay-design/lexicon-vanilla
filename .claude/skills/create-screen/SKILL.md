---
name: create-screen
description: Build a Lexicon Vanilla prototype screen as a single HTML file under `prototypes/`, composing only existing classes from `components.css`, tokens from `tokens.css`, and icons from `icons.svg`. Trigger when the user asks to create, draft, mock up, or design a screen, page, view, dashboard, prototype, or wireframe — including Spanish equivalents like "crear/crea/diseña/diseñar/maquetar/maqueta una pantalla / vista / prototipo / mock-up / wireframe" — or when they invoke `/create-screen`.
---

# create-screen — Lexicon Vanilla prototype skill

Goal: turn a screen description from the user into a working `prototypes/<slug>.html` file that opens cleanly via `file://` and uses only the kit's existing primitives — zero invented classes, icons, or colours.

The repo's full operating rules live in `CLAUDE.md` at the project root. This skill focuses on the **prototype-writing workflow** and the error vectors that tend to bite when composing screens. Read both.

---

## Step-by-step workflow

Follow these steps in order. Don't skip step 1 — guessing the screen wastes a round-trip.

### 1. Clarify only what's structurally ambiguous — invent the rest

**Invent sensible defaults for data, copy, and labels.** Pick realistic-looking column names, sample user names and emails, plausible statuses, dates, counts, descriptions, etc. The user explicitly expects the AI to invent that — do not ask them to enumerate columns, fields, or row contents.

Reserve clarifying questions for genuinely **structural** decisions, where the answer noticeably changes the layout and you cannot guess from context. Examples worth asking:

- "Sidebar" is ambiguous: `vert-bar` is a 40px icon-only rail; `vert-nav` is a text nav with section groups; `cms-menu` is a 280px panel with `vert-nav` rows + add actions. Ask which one.
- Skin scope: light-only vs working in all four skins (relevant if you'd otherwise lean on `--color-secondary-l0..l3` for text — see hard rules below).
- Which **state** to render when the request doesn't imply one (loaded vs empty vs error).

Cap clarifying questions at 1–2. If the user's request already names the components they want (e.g. "control menu + management toolbar + table"), trust it and proceed — don't re-litigate the structure.

### 2. Pick a slug and copy the scaffold

```bash
cp starter.html prototypes/<kebab-case-slug>.html
```

Never write the file from scratch — the scaffold has the skin-persistence script and the correct relative paths to `../tokens.css`, `../components.css`, `../icons.js`. Breaking those breaks the prototype.

### 3. Inventory the components you'll need

Read `CLAUDE.md` § "Components imported" for the master list — 45+ components with their key classes. For each component you'll use:

- **If you remember the API**: compose it directly.
- **If you're unsure**: read its showcase file under `showcases/` (`showcases/button.html`, `showcases/alert.html`, `showcases/vertnav.html`, …). Each showcase has every variant of that component as live HTML — copy the variant you need verbatim, then adapt the text/icons.

Showcases are the source of truth for component markup, not your memory.

### 4. Find the icons

Lexicon ships 513 icons in `icons.svg`. To find one:

```bash
grep '<symbol id=' icons.svg | grep -i <keyword>
```

Reference always as:
```html
<svg class="lexicon-icon"><use href="#name"></use></svg>
```

Sizes: `lexicon-icon-sm` (12) · `lexicon-icon` (16, default) · `lexicon-icon-lg` (24) · `lexicon-icon-xl` (32) · `lexicon-icon-2xl` (48).

**Never invent an icon name.** If your `grep` returns nothing, ask the user or pick a near match from `grep` output — don't write `<use href="#whatever-sounds-right">`.

### 5. Compose the screen

Write only inside the marked region in the scaffold (between the `EDIT BELOW` comment and `</body>`). The rest is load-bearing.

Patterns that compose well:
- Wrap the screen in `<main style="padding: var(--spacing-7);">` (or another spacing token).
- For app shells: `.control-menu` top + `.vert-bar` or `.cms-menu` left + content area. See [controlmenu.html](../../showcases/controlmenu.html), [vertbar.html](../../showcases/vertbar.html), [cmsmenu.html](../../showcases/cmsmenu.html).
- For data screens: `.management-toolbar` + `.table` or `.list`. See [managementtoolbar.html](../../showcases/managementtoolbar.html), [table.html](../../showcases/table.html), [list.html](../../showcases/list.html).
- For form screens: `.sheet` (form sheet) with `.sheet-header` + rows + `.sheet-footer`. See [formsheet.html](../../showcases/formsheet.html).
- For empty/loading states: `.empty-state` with one of the three shipped illustrations. See [empty.html](../../showcases/empty.html).

### 6. Verify

You **cannot** start a server (see hard rule below). After saving, tell the user the path and ask them to open the file (Finder double-click, or `open prototypes/<slug>.html`). If they share a screenshot and something's off, iterate from the file, not from a localhost.

---

## Hard rules (these are the error vectors)

These come from `CLAUDE.md` and from concrete past mistakes. Violating any of them produces a broken or off-spec prototype.

### Build / serving

| ✗ Don't | ✓ Do |
|---|---|
| `python -m http.server`, `npx serve`, `mcp__Claude_Preview__preview_start` | Open the file with `file://`. The user double-clicks. |
| `fetch('icons.svg')` | Use `<script src="../icons.js"></script>` — already in `starter.html`. |
| `<use href="icons.svg#name">` (external ref) | `<use href="#name">` (icons.js inlines the sprite into the document). |
| Add a per-prototype `.css` file | Compose existing classes. If a primitive is missing, **extend `components.css`** instead. |

### Tokens (no literal values)

| ✗ Don't | ✓ Do |
|---|---|
| `style="color: #0B5FFF"` | `style="color: var(--color-primary)"` |
| `padding: 16px` | `padding: var(--spacing-4)` |
| `font-size: 14px` | `font-size: var(--font-size-sm)` |
| `border-radius: 4px` | `border-radius: var(--border-radius)` |
| Fallback like `var(--color-light-l3, #f7f8f9)` | Just `var(--color-light-l1)` — no fallback hex. |

### Skin-safe colour choices

In Light HC and Dark HC, the secondary colour scale collapses to a flat tone. So:

| ✗ Don't (disappears in HC) | ✓ Do (reskins cleanly) |
|---|---|
| `color: var(--color-secondary-l0)` for text or icon | `color: var(--color-dark); opacity: 0.55;` |
| Use `--color-secondary-l1/l2/l3` for text | Same — `--color-dark` + `opacity` |

`--color-secondary-*` is fine for borders and surfaces — just not for text/icons that must stay legible.

`--color-white` and `--color-dark` are **semantic**, not literal. In dark skin `--color-white` becomes near-black and `--color-dark` becomes near-white. Read them as "default surface" and "default text".

### Icons

| ✗ Don't | ✓ Do |
|---|---|
| Inline a custom `<svg>` with `<path d="…">` | `<use href="#name-from-icons.svg">` |
| Use Heroicons / Font Awesome / emoji as decoration | Lexicon icon from the sprite. |
| Guess an icon name | `grep '<symbol id=' icons.svg \| grep -i <keyword>` and pick from the result. |

### State classes

| ✗ Don't | ✓ Do |
|---|---|
| Add `.is-focused` to demonstrate focus | Omit it. Real `:focus-visible` fires on keyboard nav. The class exists only for Figma-import edge cases — never in showcase or prototype HTML. |
| Add `.is-active`, `.is-selected`, `.is-disabled`, `.has-notification` only when they're meaningful for the screen state — they're real and intended. |

### Component composition

- Buttons: `.btn` + one type (`--primary` / `--secondary` / `--borderless` / `--link`) + optional tone (`--info` / `--success` / `--warning` / `--danger`) + optional size (`--xs` / `--sm` / default / `--lg`) + optional shape (`--pill` / `--icon`). Example: `<button class="btn btn--primary btn--success btn--sm">…</button>`.
- Icon-only buttons need `aria-label`. Without it, screen readers see nothing.
- `.btn--icon` is for square icon buttons. Don't combine with text.
- Input groups have a fixed size: `.input-group` is 40px, `.input-group--sm` is 32px. Don't put `.btn--sm` inside a regular `.input-group` — they won't align.
- Modal/side-panel/dropdown markup is static-friendly: no JS needed for the showcase, just render the open state if you want to demo it.

### Imagery

For decorative illustrations (empty states, hero areas), the kit ships three SVGs under `illustrations/`:
- `illustrations/illustration-satellite.svg`
- `illustrations/illustration-spaceship.svg`
- `illustrations/illustration-telescope.svg`

Reference them from a prototype as `<img src="../illustrations/illustration-spaceship.svg" alt="">`. **Do not** ask for new bespoke illustrations — they don't exist in the repo and you can't generate them.

For avatars / product images, use `.sticker` (initials, image, or icon). See [sticker.html](../../showcases/sticker.html).

---

## Anatomy of a well-formed prototype

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ Concrete screen title }}</title>

  <!-- KEEP THIS BLOCK INTACT — copied from starter.html.
       Applies both the active skin (vanilla-skin) and the CMS Style flag
       (vanilla-cms-style → overrides --rounded-sm/md/lg). -->
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
  <link rel="stylesheet" href="../tokens.css">
  <link rel="stylesheet" href="../tokens-high-contrast.css">
  <link rel="stylesheet" href="../tokens-dark.css">
  <link rel="stylesheet" href="../components.css">
  <script src="../icons.js"></script>
</head>
<body>

<!-- EDIT BELOW. Compose with classes from components.css only. -->

<main style="padding: var(--spacing-7); display: flex; flex-direction: column; gap: var(--spacing-5);">
  <!-- Your composition here -->
</main>

</body>
</html>
```

The block between `<script>(function(){…})()</script>` and `<script src="../icons.js"></script>` is not optional. It wires up:
- Skin persistence across reloads (`vanilla-skin` localStorage key).
- CMS Style propagation (`vanilla-cms-style` localStorage key → overrides `--rounded-sm/md/lg`).
- Light, Light HC, Dark, Dark HC tokens.
- The component stylesheet.
- The icon sprite loader.

Drop any one and the prototype breaks in one of the four skins, ignores the CMS Style toggle from `index.html`, or icons render as empty squares.

---

## Concrete example

Request: *"Settings page with a sidebar of sections and a form for the active one"*.

```html
<main style="display: grid; grid-template-columns: 280px 1fr; gap: var(--spacing-6); padding: var(--spacing-6); min-height: 100vh;">

  <!-- Sidebar -->
  <nav class="vert-nav">
    <h3 class="vert-nav__section">Settings</h3>
    <ul class="vert-nav__list">
      <li><a href="#" class="vert-nav__item is-active">
        <svg class="lexicon-icon"><use href="#user"></use></svg>
        <span>Profile</span>
      </a></li>
      <li><a href="#" class="vert-nav__item">
        <svg class="lexicon-icon"><use href="#password-policies"></use></svg>
        <span>Security</span>
      </a></li>
      <li><a href="#" class="vert-nav__item">
        <svg class="lexicon-icon"><use href="#bell-on"></use></svg>
        <span>Notifications</span>
      </a></li>
    </ul>
  </nav>

  <!-- Form sheet -->
  <section class="sheet">
    <header class="sheet-header">
      <h2 class="sheet-header__title">Profile</h2>
      <p class="sheet-header__subtitle">Update how others see you.</p>
    </header>

    <div class="sheet-row">
      <label class="input">
        <span class="input__label">First name</span>
        <input type="text" class="input__field" value="Veronica">
      </label>
      <label class="input">
        <span class="input__label">Last name</span>
        <input type="text" class="input__field" value="Gonzalez">
      </label>
    </div>

    <label class="input">
      <span class="input__label">Email</span>
      <input type="email" class="input__field" value="veronica.gonzalez@liferay.com">
    </label>

    <footer class="sheet-footer">
      <button class="btn btn--secondary">Cancel</button>
      <button class="btn btn--primary">Save changes</button>
    </footer>
  </section>

</main>
```

Notes on what makes this a *good* prototype:
- Every colour, spacing, font reference is a token.
- Every class exists in `components.css` (verify by greping).
- Every icon id was confirmed via `grep '<symbol id=' icons.svg`.
- No `.is-focused` decoration. Tab into the inputs in the browser to see real focus rings.
- Real labels and a real-ish email — not Lorem.
- Works in all four skins because nothing is hardcoded.

---

## When a primitive is genuinely missing

If, after reading the relevant showcase, you're sure the kit is missing a primitive:

1. **Stop and tell the user.** Don't paper over it with bespoke CSS in the prototype.
2. Propose: "I'd extend `components.css` with a `.foo` class — should I?"
3. If they say yes, add it to `components.css` (not the prototype) using only tokens, and re-skin-test all four skins mentally before committing.

This keeps the kit consistent across prototypes instead of accumulating one-off styles per file.

---

## Quick recall checklist (run before declaring done)

- [ ] File saved at `prototypes/<kebab-case-slug>.html`.
- [ ] The 6 head lines from `starter.html` are intact and unmodified.
- [ ] Every colour / spacing / font-size is a `var(--…)`.
- [ ] No `.is-focused` anywhere.
- [ ] No `--color-secondary-l0..l3` used as text colour.
- [ ] Every `#icon-name` was confirmed via `grep` of `icons.svg`.
- [ ] Every component class exists in `components.css` (grep to be sure).
- [ ] Icon-only buttons have `aria-label`.
- [ ] No `fetch`, no localhost, no per-prototype CSS file, no inline custom SVG paths.
- [ ] Asked the user to open the file via Finder / `open` — did not start a server.
