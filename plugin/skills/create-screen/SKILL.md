---
name: create-screen
description: Build a Lexicon Vanilla prototype screen as a single HTML file under prototypes/, composing only existing kit components (components.css), tokens (tokens.css), and icons (icons.svg). Bootstraps the kit into the working directory on first use. Trigger when the user asks to create, draft, mock up, or design a screen, page, view, dashboard, prototype, or wireframe, including Spanish equivalents like "crear/crea/disena/maquetar una pantalla / vista / prototipo / mock-up / wireframe", or when they invoke /create-screen.
---

# create-screen (Lexicon Vanilla plugin)

Turn a screen description into a working `prototypes/<slug>.html` that opens over `file://` and uses only the kit's primitives: zero invented classes, icons, or colours. The kit assets are vendored into the working directory on first use, so this works in any folder.

## Step 0: Ensure the kit is present (once per directory)

Before composing, make sure the kit exists in the current directory. Run this in Bash:

```bash
REPO="liferay-design/lexicon-vanilla"
GH="https://github.com/$REPO"
if [ ! -f .lexicon ]; then
  # Pin to the newest release tag. One call to github.com only, so it also works
  # behind host allowlists that block raw.githubusercontent.com. Fall back to main.
  VER=$(git ls-remote --tags --refs "$GH.git" 2>/dev/null | sed -n 's#.*refs/tags/v##p' | sort -V | tail -1)
  if [ -n "$VER" ]; then REF="v$VER"; ARCHIVE="refs/tags/v$VER"; else VER="main"; REF="main"; ARCHIVE="refs/heads/main"; fi
  TMP=$(mktemp -d)
  # 1) Release tarball. github.com redirects it to codeload.github.com, which some
  #    sandboxes (Cowork, proxies with a host allowlist) answer with a 403.
  curl -fsSL "$GH/archive/$ARCHIVE.tar.gz" 2>/dev/null | tar xz --strip-components=1 -C "$TMP" 2>/dev/null
  # 2) Fallback: shallow git clone of the same ref, which only talks to github.com.
  if [ ! -f "$TMP/components.css" ]; then
    rm -rf "$TMP"; TMP=$(mktemp -d)
    git -c advice.detachedHead=false clone -q --depth 1 --branch "$REF" "$GH.git" "$TMP" 2>/dev/null || true
  fi
  # Install only if the kit really landed, so a failed download retries next time.
  if [ -f "$TMP/components.css" ] && [ -f "$TMP/prototypes/login.html" ] && [ -d "$TMP/showcases" ]; then
    cp "$TMP"/tokens*.css "$TMP"/components.css "$TMP"/icons.svg "$TMP"/icons.js "$TMP"/starter.html ./
    for d in shells showcases prototypes product-icons; do
      [ -d "$TMP/$d" ] && mkdir -p "$d" && cp -R "$TMP/$d/." "$d/"
    done
    [ -f "$TMP/navigation.js" ] && cp "$TMP/navigation.js" ./
    printf '{"version":"%s","lastCheck":"%s"}\n' "$VER" "$(date +%F)" > .lexicon
    echo "Kit $VER installed."
  else
    echo "ERROR: could not download the kit. Both the release tarball (github.com -> codeload.github.com) and a git clone (github.com) failed. .lexicon not written; re-run to retry. Behind a network allowlist, github.com must be reachable."
  fi
  rm -rf "$TMP"
fi
```

Run this command exactly as written. Do not drop directories from the copy list: `prototypes/` and `showcases/` are required references, not optional. If it prints the ERROR line, say so and stop: never substitute invented styling, and never try to route around a network block.

Then a throttled update check (at most once per day). If it prints `update:<version>`, tell the user one line: "Lexicon Vanilla `<version>` is available, run /lexicon-refresh." Do not auto-update.

```bash
REPO="liferay-design/lexicon-vanilla"
if [ -f .lexicon ]; then
  LAST=$(sed -n 's/.*"lastCheck":"\([^"]*\)".*/\1/p' .lexicon)
  TODAY=$(date +%F)
  if [ "$LAST" != "$TODAY" ]; then
    LOCAL=$(sed -n 's/.*"version":"\([^"]*\)".*/\1/p' .lexicon)
    REMOTE=$(git ls-remote --tags --refs "https://github.com/$REPO.git" 2>/dev/null | sed -n 's#.*refs/tags/v##p' | sort -V | tail -1)
    [ -z "$REMOTE" ] && REMOTE="$LOCAL"
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
