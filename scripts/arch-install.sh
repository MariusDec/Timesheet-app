#!/usr/bin/env bash
# Repackage the Tauri .deb as an Arch package and install it with pacman.
#
#   scripts/arch-install.sh           bump pkgrel, makepkg, pacman -U
#   scripts/arch-install.sh --build   run `npm run tauri:build` first
#
# If the app version in src-tauri/tauri.conf.json differs from pkgver in the
# PKGBUILD, pkgver is updated to match and pkgrel is reset to 1. Otherwise
# pkgrel is incremented.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pkgbuild="$root/packaging/PKGBUILD"

if [[ "${1:-}" == "--build" ]]; then
  (cd "$root" && npm run tauri:build)
fi

app_ver="$(node -p "require('$root/src-tauri/tauri.conf.json').version")"
pkgver="$(sed -n 's/^pkgver=//p' "$pkgbuild")"
pkgrel="$(sed -n 's/^pkgrel=//p' "$pkgbuild")"

if [[ "$app_ver" != "$pkgver" ]]; then
  new_ver="$app_ver"
  new_rel=1
else
  new_ver="$pkgver"
  new_rel=$((pkgrel + 1))
fi

deb="$root/src-tauri/target/release/bundle/deb/Timesheet_${new_ver}_amd64.deb"
if [[ ! -f "$deb" ]]; then
  echo "error: $deb not found. Run 'npm run tauri:build' (or pass --build)." >&2
  exit 1
fi

sed -i -e "s/^pkgver=.*/pkgver=$new_ver/" -e "s/^pkgrel=.*/pkgrel=$new_rel/" "$pkgbuild"
echo "==> timesheet $pkgver-$pkgrel -> $new_ver-$new_rel"

cd "$root/packaging"
makepkg -f
sudo pacman -U --noconfirm "timesheet-${new_ver}-${new_rel}-x86_64.pkg.tar.zst"
