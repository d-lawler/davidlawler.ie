#!/usr/bin/env sh
# Pulls the licensed webfonts from the private d-lawler/d-lawler-fonts repo
# into public/fonts before a build. The fonts are not in this repo.
set -e
DEST="public/fonts"
TMP="$(mktemp -d)"

if [ -z "$FONTS_TOKEN" ]; then
  if ls "$DEST"/*.woff2 >/dev/null 2>&1; then
    echo "fetch-fonts: FONTS_TOKEN not set, using fonts already in $DEST"
  else
    echo "fetch-fonts: FONTS_TOKEN not set, building with fallback fonts"
  fi
  exit 0
fi

git clone --quiet --depth 1 "https://x-access-token:${FONTS_TOKEN}@github.com/d-lawler/d-lawler-fonts.git" "$TMP"
mkdir -p "$DEST"
cp "$TMP"/*.woff2 "$DEST"/
rm -rf "$TMP"
echo "fetch-fonts: installed $(ls "$DEST"/*.woff2 | wc -l | tr -d ' ') fonts"
