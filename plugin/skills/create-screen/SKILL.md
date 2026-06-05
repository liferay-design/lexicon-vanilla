---
name: create-screen
description: Build a Lexicon Vanilla prototype screen as a single HTML file under prototypes/, composing only existing kit components (components.css), tokens (tokens.css), and icons (icons.svg). Bootstraps the kit into the working directory on first use. Trigger when the user asks to create, draft, mock up, or design a screen, page, view, dashboard, prototype, or wireframe, including Spanish equivalents like "crear/crea/disena/maquetar una pantalla / vista / prototipo / mock-up / wireframe", or when they invoke /create-screen.
---

# create-screen (Lexicon Vanilla plugin)

Turn a screen description into a working `prototypes/<slug>.html` that opens over `file://` and uses only the kit's primitives: zero invented classes, icons, or colours. The kit assets are vendored into the working directory on first use, so this works in any folder.

## Step 0: Ensure the kit is present (once per directory)

Before composing, make sure the kit exists in the current directory. Run this in Bash:

```bash
REPO="marcoscv-work/lexicon-vanilla"
if [ ! -f .lexicon ]; then
  # Pin to the published release tag; fall back to main only if VERSION is unreachable.
  VER=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null)
  if [ -n "$VER" ]; then REF="refs/tags/v$VER"; DIR="lexicon-vanilla-$VER"; else REF="refs/heads/main"; DIR="lexicon-vanilla-main"; VER="main"; fi
  curl -fsSL "https://github.com/$REPO/archive/$REF.tar.gz" \
    | tar xz --strip-components=1 \
        "$DIR/tokens.css" \
        "$DIR/tokens-high-contrast.css" \
        "$DIR/tokens-dark.css" \
        "$DIR/components.css" \
        "$DIR/icons.svg" \
        "$DIR/icons.js" \
        "$DIR/starter.html" \
        "$DIR/shells" \
        "$DIR/showcases" \
        "$DIR/prototypes"
  # Only stamp .lexicon if the kit really landed, so a failed download retries next time.
  if [ -f components.css ] && [ -f prototypes/login.html ] && [ -d showcases ]; then
    printf '{"version":"%s","lastCheck":"%s"}\n' "$VER" "$(date +%F)" > .lexicon
    echo "Kit $VER installed."
  else
    echo "ERROR: kit download incomplete; .lexicon not written. Re-run to retry."
  fi
fi
```

Run this command exactly as written. Do not drop entries from the tar list: `prototypes/` and `showcases/` are required references, not optional.

Then a throttled update check (at most once per day). If it prints `update:<version>`, tell the user one line: "Lexicon Vanilla `<version>` is available, run /lexicon-refresh." Do not auto-update.

```bash
REPO="marcoscv-work/lexicon-vanilla"
if [ -f .lexicon ]; then
  LAST=$(sed -n 's/.*"lastCheck":"\([^"]*\)".*/\1/p' .lexicon)
  TODAY=$(date +%F)
  if [ "$LAST" != "$TODAY" ]; then
    LOCAL=$(sed -n 's/.*"version":"\([^"]*\)".*/\1/p' .lexicon)
    REMOTE=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null || echo "$LOCAL")
    printf '{"version":"%s","lastCheck":"%s"}\n' "$LOCAL" "$TODAY" > .lexicon
    NEWEST=$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V | tail -1)
    { [ "$LOCAL" != "$REMOTE" ] && [ "$NEWEST" = "$REMOTE" ] && echo "update:$REMOTE"; } || true
  fi
fi
```

Token discipline (non-negotiable, this is what keeps it "vanilla"): the shell moves the files. NEVER read the downloaded assets into context to install them. You only read the few files you compose against, later.

## Step 1: Clarify only structural ambiguities, invent the rest

Invent realistic sample data, copy, labels, names, emails, statuses, dates. Do NOT ask the user to enumerate columns or fields. Reserve questions for genuinely structural decisions you cannot infer (which sidebar variant, skin scope, which state to render). Cap at 1-2 questions. If the request already names the components, trust it.

## Step 2: Pick a starting point

- `starter.html`: blank scaffold (skin script + stylesheets only).
- `shells/cms.html`: Control Menu (top) + 280px CMS sidebar + content.
- `shells/dxp.html`: Control Panel (320px) + Control Menu.
- An existing `prototypes/*.html`: copy or reference.

Examine `prototypes/` and `showcases/` first: a similar layout may already exist. Copy the chosen file to `prototypes/<kebab-slug>.html`, keep its head block intact, edit only the marked content region.

## Step 3: Compose (token-light)

- Read ONLY the targeted `showcases/<component>.html` for components you actually use. Never `cat components.css` whole.
- Icons: `grep '<symbol id=' icons.svg | grep -i <keyword>` and reference as `<svg class="lexicon-icon"><use href="#name"></use></svg>`. Never `cat icons.svg`.
- Skim `prototypes/` with `ls`; read at most the one closest example.

## Hard rules

- No build, no server. Must work over `file://`. No `fetch()`, no external `<use href="file.svg#id">`.
- Tokens only: every colour / spacing / font-size / radius is a `var(--...)`. No raw hex or px (except inside token files).
- Lexicon icons only, from the sprite, at Lexicon sizes.
- Skin-safe text: avoid `--color-secondary-l0..l3` for text/icons; use `var(--color-dark)` + opacity.
- Never use `.is-focused` in prototype HTML.
- No per-prototype CSS file; if a primitive is missing, extend `components.css`, not the prototype.
- Icon-only buttons need `aria-label`.

## Step 4: Record, then open in the browser (ask once per directory)

After writing the prototype, record it so `/lexicon-vanilla:export` knows which files are the user's (one filename per line, no path):

```bash
echo "<slug>.html" >> .lexicon-mine
```

For a multi-page prototype, append one line per page you created. Then always tell the user the path and handle opening it:

- Check whether `.lexicon-open` exists in the working directory.
- If it does NOT exist, this is the first screen created here: ask the user "Do you want to open prototypes in the browser?" Record the answer with `echo yes > .lexicon-open` or `echo no > .lexicon-open`.
- If it exists, honor it silently and do NOT ask again: open when it contains `yes`, skip when it contains `no`.

When the recorded choice is `yes`, open the new file (this uses `file://`, never a server):

```bash
open "prototypes/<slug>.html" 2>/dev/null || xdg-open "prototypes/<slug>.html" 2>/dev/null
```

Do not start a server. If the user shares a screenshot, iterate from the file.
