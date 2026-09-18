#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <upload-root> <owner> [group]" >&2
  exit 64
fi

upload_root="$1"
owner="$2"
group="${3:-$owner}"

install -d -o "$owner" -g "$group" -m 0750 "$upload_root"
install -d -o "$owner" -g "$group" -m 0750 "$upload_root/.tmp"
install -d -o "$owner" -g "$group" -m 0750 "$upload_root/assignments"

echo "Created private upload directories under $upload_root"
