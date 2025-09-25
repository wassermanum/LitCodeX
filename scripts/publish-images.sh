#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REGISTRY_HOST=${REGISTRY_HOST:-ghcr.io}
NAMESPACE=${GHCR_NAMESPACE:-}
IMAGE_TAG=${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}
SERVICE_PREFIX=${SERVICE_PREFIX:-litcodex}

if [[ -z "$NAMESPACE" ]]; then
  echo "Error: set GHCR_NAMESPACE environment variable (e.g., github-user or org)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker CLI not found in PATH." >&2
  exit 1
fi

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "Authenticating to $REGISTRY_HOST as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login "$REGISTRY_HOST" -u "$GHCR_USERNAME" --password-stdin
fi

if ! docker system info >/dev/null 2>&1; then
  echo "Docker daemon unavailable." >&2
  exit 1
fi

API_IMAGE="${REGISTRY_HOST}/${NAMESPACE}/${SERVICE_PREFIX}-api:${IMAGE_TAG}"
APP_IMAGE="${REGISTRY_HOST}/${NAMESPACE}/${SERVICE_PREFIX}-app:${IMAGE_TAG}"

echo "Building backend image: $API_IMAGE"
docker build \
  --file "$ROOT_DIR/api/Dockerfile" \
  --tag "$API_IMAGE" \
  "$ROOT_DIR"

echo "Building frontend image: $APP_IMAGE"
docker build \
  --file "$ROOT_DIR/app/Dockerfile" \
  --tag "$APP_IMAGE" \
  "$ROOT_DIR"

echo "Pushing backend image"
docker push "$API_IMAGE"

echo "Pushing frontend image"
docker push "$APP_IMAGE"

echo "Done."
