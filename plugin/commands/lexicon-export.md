---
description: Export only your created prototypes plus the minimal dependencies into a self-contained, shareable bundle (export/ + export.zip).
---

Export the prototypes the user created in this directory into a self-contained bundle that opens over `file://` with no extra setup. Optional `$ARGUMENTS` is a name filter (export only prototypes whose filename matches it).

Run this in Bash (default mode: folder + zip):

```bash
OUT="export"
rm -rf "$OUT"; mkdir -p "$OUT/prototypes"

# 1. Minimal runtime dependencies a prototype needs over file://
for f in tokens.css tokens-high-contrast.css tokens-dark.css components.css icons.js; do
  [ -f "$f" ] && cp "$f" "$OUT/"
done

# 2. Decide which prototypes are "yours": prefer .lexicon-mine, else everything
#    in prototypes/ that is NOT a canonical kit example (from kit-manifest.json).
if [ -f .lexicon-mine ]; then
  LIST=$(sort -u .lexicon-mine)
else
  CANON=$( [ -f kit-manifest.json ] && grep -o '"[A-Za-z0-9_-]*\.html"' kit-manifest.json | tr -d '"' )
  LIST=$(for p in prototypes/*.html; do [ -f "$p" ] || continue; b=$(basename "$p"); printf '%s\n' "$CANON" | grep -qx "$b" || echo "$b"; done)
fi

# 3. Copy them (optionally filtered by $ARGUMENTS)
FILTER="$ARGUMENTS"
N=0
for b in $LIST; do
  [ -f "prototypes/$b" ] || continue
  [ -n "$FILTER" ] && { echo "$b" | grep -q "$FILTER" || continue; }
  cp "prototypes/$b" "$OUT/prototypes/"
  N=$((N+1))
done

# 4. Copy local assets only if the exported pages reference them
grep -rql "illustrations/" "$OUT/prototypes" 2>/dev/null && [ -d illustrations ] && cp -R illustrations "$OUT/"
grep -rql "/img/" "$OUT/prototypes" 2>/dev/null && [ -d prototypes/img ] && cp -R prototypes/img "$OUT/prototypes/"

# 5. Contact sheet linking the exported pages
{ printf '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Prototypes</title></head><body><h1>Prototypes</h1><ul>'
  for h in "$OUT"/prototypes/*.html; do [ -f "$h" ] || continue; b=$(basename "$h"); printf '<li><a href="prototypes/%s">%s</a></li>' "$b" "$b"; done
  printf '</ul></body></html>'; } > "$OUT/index.html"

# 6. Package
if [ "$N" -eq 0 ]; then
  echo "No prototypes of yours found to export (only kit examples are present)."
elif command -v zip >/dev/null 2>&1; then
  ( cd "$OUT" && zip -rq ../export.zip . ); echo "Exported $N prototype(s) to ./export and ./export.zip"
else
  tar czf export.tgz -C "$OUT" .; echo "Exported $N prototype(s) to ./export and ./export.tgz"
fi
```

Tell the user the resulting paths. The recipient unzips and double-clicks any HTML (or `index.html`); it works offline. Avatars loaded from external URLs need internet but degrade gracefully.

## Optional modes (only if the user asks)

- **Single self-contained file per page**: inline `tokens.css` + `tokens-high-contrast.css` + `tokens-dark.css` + `components.css` into a `<style>` block and the contents of `icons.js` into a `<script>` block inside each exported HTML, then drop the `../*.css` / `../icons.js` links. Each page becomes one portable `.html` with zero dependencies (heavier, since the CSS is duplicated per page). Good for sharing a single screen.

- **Push to a repository**: if `gh` is available, `gh repo create <name> --public --source export --push` publishes the bundle. Or initialize a git repo in `export/` and let the user push it. Mention GitHub Pages if they want it viewable online.
