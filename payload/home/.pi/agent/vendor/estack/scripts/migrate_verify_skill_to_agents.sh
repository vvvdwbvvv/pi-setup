#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"
LEGACY="$ROOT/.cursor/skills"
TARGET="$ROOT/.agents/skills"

shopt -s nullglob
legacy_dirs=("$LEGACY"/verify-*)
if ((${#legacy_dirs[@]} == 0)); then
  echo "No .cursor/skills/verify-* directories under $ROOT"
  exit 0
fi

mkdir -p "$TARGET"
for src in "${legacy_dirs[@]}"; do
  name="$(basename "$src")"
  dest="$TARGET/$name"
  if [[ -e "$dest" ]]; then
    echo "Skip $name: already exists at $dest"
    continue
  fi
  mv "$src" "$dest"
  echo "Moved $src -> $dest"
done

if [[ -d "$LEGACY" ]] && [[ -z "$(ls -A "$LEGACY" 2>/dev/null)" ]]; then
  rmdir "$LEGACY" 2>/dev/null || true
fi

echo "Done. Optional: remove empty .cursor/ if unused."
