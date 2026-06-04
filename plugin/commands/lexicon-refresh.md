---
description: Update the local Lexicon Vanilla kit to the latest published version (never deletes your own prototypes).
---

Refresh the Lexicon Vanilla kit in the current directory to the latest published version. Run this in Bash, then report the version installed:

```bash
REPO="marcoscv-work/lexicon-vanilla"
VER=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null)
if [ -n "$VER" ]; then REF="refs/tags/v$VER"; DIR="lexicon-vanilla-$VER"; else REF="refs/heads/main"; DIR="lexicon-vanilla-main"; VER="main"; fi
TMP=$(mktemp -d)
curl -fsSL "https://github.com/$REPO/archive/$REF.tar.gz" \
  | tar xz --strip-components=1 -C "$TMP" \
      "$DIR/tokens.css" \
      "$DIR/tokens-high-contrast.css" \
      "$DIR/tokens-dark.css" \
      "$DIR/components.css" \
      "$DIR/icons.svg" \
      "$DIR/icons.js" \
      "$DIR/starter.html" \
      "$DIR/shells" \
      "$DIR/showcases" \
      "$DIR/prototypes" \
      "$DIR/kit-manifest.json"

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
