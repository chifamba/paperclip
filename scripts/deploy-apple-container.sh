#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-paperclip}"
HOST_PORT="${HOST_PORT:-3100}"
DATA_DIR="${DATA_DIR:-$REPO_ROOT/data/apple-container-paperclip}"

mkdir -p "$DATA_DIR"

if ! command -v container &> /dev/null; then
  echo "Error: The 'container' command was not found."
  echo "Please install Apple's container tool from https://github.com/apple/container"
  exit 1
fi

echo "==> Building container image using Apple's container tool"
container build --tag "$IMAGE_NAME" --file "$REPO_ROOT/Dockerfile" "$REPO_ROOT"

echo "==> Running container"
container run -d \
  --name "$IMAGE_NAME" \
  -p "$HOST_PORT:3100" \
  --env HOST=0.0.0.0 \
  --env PORT=3100 \
  --env PAPERCLIP_HOME=/paperclip \
  --volume "$DATA_DIR:/paperclip" \
  "$IMAGE_NAME"

echo "==> Paperclip is running on http://localhost:$HOST_PORT"
