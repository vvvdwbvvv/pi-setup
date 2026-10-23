#!/bin/sh
# One-command restore from a cloned git repository.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
python3 "$SCRIPT_DIR/migrate.py" verify
exec python3 "$SCRIPT_DIR/migrate.py" restore \
  --bundle "$SCRIPT_DIR" --allow-install-scripts "$@"
