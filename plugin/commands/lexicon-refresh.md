---
description: Update the local Lexicon Vanilla kit to the latest published version (never deletes your own prototypes).
---

Refresh the Lexicon Vanilla kit in the current directory to the latest published version. Run this in Bash, then report the version installed:

```bash
REPO="marcoscv-work/lexicon-vanilla"
VER=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null || echo "main")
TMP=$(mktemp -d)
curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.tar.gz" \
  | tar xz --strip-components=1 -C "$TMP" \
      lexicon-vanilla-main/tokens.css \
      lexicon-vanilla-main/tokens-high-contrast.css \
      lexicon-vanilla-main/tokens-dark.css \
      lexicon-vanilla-main/components.css \
      lexicon-vanilla-main/icons.svg \
      lexicon-vanilla-main/icons.js \
      lexicon-vanilla-main/starter.html \
      lexicon-vanilla-main/shells \
      lexicon-vanilla-main/showcases \
      lexicon-vanilla-main/prototypes \
      lexicon-vanilla-main/kit-manifest.json

# Runtime + reference material: overwrite wholesale
cp "$TMP"/tokens*.css "$TMP"/components.css "$TMP"/icons.svg "$TMP"/icons.js "$TMP"/starter.html ./
rm -rf shells showcases
cp -R "$TMP/shells" "$TMP/showcases" ./

# Prototypes: overwrite ONLY the canonical examples listed in kit-manifest.json.
# Your own prototypes are never touched or deleted.
mkdir -p prototypes
grep -o '"[A-Za-z0-9_-]*\.html"' "$TMP/kit-manifest.json" | tr -d '"' | sort -u | while read -r f; do
  [ -f "$TMP/prototypes/$f" ] && cp "$TMP/prototypes/$f" "prototypes/$f"
done

printf '{"version":"%s","lastCheck":"%s"}\n' "$VER" "$(date +%F)" > .lexicon
rm -rf "$TMP"
echo "Lexicon Vanilla refreshed to $VER."
```
