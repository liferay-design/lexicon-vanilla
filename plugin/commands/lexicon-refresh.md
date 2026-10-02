---
description: Update the local Lexicon Vanilla kit to the latest published version (never deletes your own prototypes).
---

Refresh the Lexicon Vanilla kit in the current directory to the latest published version. Run this in Bash, then report the version installed:

```bash
REPO="liferay-design/lexicon-vanilla"
GH="https://github.com/$REPO"
# Newest release tag. One call to github.com only, so it also works behind host
# allowlists that block raw.githubusercontent.com. Fall back to main.
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

# Safety gate: touch the working copy ONLY if the download is complete
if [ ! -f "$TMP/components.css" ] || [ ! -d "$TMP/shells" ] || [ ! -d "$TMP/showcases" ]; then
  rm -rf "$TMP"
  echo "Download failed — nothing was changed. Both the release tarball (github.com -> codeload.github.com) and a git clone (github.com) were unreachable. Behind a network allowlist, github.com must be allowed. Try again later."
  exit 1
fi

# Runtime + reference material: overwrite wholesale
cp "$TMP"/tokens*.css "$TMP"/components.css "$TMP"/icons.svg "$TMP"/icons.js "$TMP"/starter.html ./
rm -rf shells showcases
cp -R "$TMP/shells" "$TMP/showcases" ./
if [ -d "$TMP/product-icons" ]; then rm -rf product-icons; cp -R "$TMP/product-icons" ./; fi
[ -f "$TMP/navigation.js" ] && cp "$TMP/navigation.js" ./

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
