---
description: Update the local Lexicon Vanilla kit to the latest published version (never deletes your own prototypes).
---

Refresh the Lexicon Vanilla kit in the current directory to the latest published version. Run this in Bash, then report the version installed:

```bash
REPO="liferay-design/lexicon-vanilla"
VER=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null)

# Prefer the release tag; fall back to main if the tag is missing
REF="refs/heads/main"; DIR="lexicon-vanilla-main"
if [ -n "$VER" ] && curl -fsIL -o /dev/null "https://github.com/$REPO/archive/refs/tags/v$VER.tar.gz" 2>/dev/null; then
  REF="refs/tags/v$VER"; DIR="lexicon-vanilla-$VER"
else
  VER="main"
fi

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

# Safety gate: touch the working copy ONLY if the download is complete
if [ ! -f "$TMP/components.css" ] || [ ! -d "$TMP/shells" ] || [ ! -d "$TMP/showcases" ]; then
  rm -rf "$TMP"
  echo "Download failed — nothing was changed. Try again later."
  exit 1
fi

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

# Canonical prototype directories (e.g. PLG patterns, shared images)
for d in $(sed -n 's/.*"canonicalPrototypeDirs": *\[\(.*\)\].*/\1/p' "$TMP/kit-manifest.json" | tr -d '" ' | tr ',' ' '); do
  if [ -d "$TMP/prototypes/$d" ]; then
    rm -rf "prototypes/$d"
    cp -R "$TMP/prototypes/$d" "prototypes/$d"
  fi
done

printf '{"version":"%s","lastCheck":"%s"}\n' "$VER" "$(date +%F)" > .lexicon
rm -rf "$TMP"
echo "Lexicon Vanilla refreshed to $VER."
```
