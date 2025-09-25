# Container Deployment Guide

Follow this checklist to build, publish, and launch the LitCodeX frontend and backend with demo data included.

## 1. Prerequisites
- Docker Engine installed and running.
- GitHub Container Registry (GHCR) Personal Access Token with `write:packages` scope.
- The GHCR namespace (usually your GitHub username or organization).

Authenticate once per workstation:
```bash
export GHCR_USERNAME=<github-username>
export GHCR_TOKEN=<personal-access-token>
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

## 2. Build & Push Images
From the repository root:
```bash
export GHCR_NAMESPACE=<github-username-or-org>
export IMAGE_TAG=$(date +%Y%m%d%H%M%S)
# Optional: have the script authenticate for you
# export GHCR_USERNAME=<github-username>
# export GHCR_TOKEN=<personal-access-token>
# Optional: override service prefix (default: litcodex)
# export SERVICE_PREFIX=orders

./scripts/publish-images.sh
```

This script:
- Builds `api/Dockerfile` and `app/Dockerfile` using the repo root as context.
- Tags images as `ghcr.io/$GHCR_NAMESPACE/${SERVICE_PREFIX}-{api|app}:$IMAGE_TAG`.
- Pushes both images to GitHub Container Registry, authenticating automatically if `GHCR_USERNAME` and `GHCR_TOKEN` are provided.

## 3. Runtime Configuration
The backend container runs migrations and loads `234.txt` on startup. Provide a `DATABASE_URL` (e.g., `file:./dev.db` for local SQLite or a managed database connection string).

### Remote deployment script
Save the following script on the target host (for example `deploy-containers.sh`) and make it executable:
```bash
#!/bin/bash
set -euo pipefail

GHCR_NAMESPACE=${GHCR_NAMESPACE:-hu553in}
SERVICE_PREFIX=${SERVICE_PREFIX:-litcodex}
IMAGE_TAG=${IMAGE_TAG:-20250926012558}
GHCR_USERNAME=${GHCR_USERNAME:-}
GHCR_TOKEN=${GHCR_TOKEN:-}

if [[ -n "$GHCR_USERNAME" && -n "$GHCR_TOKEN" ]]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

docker stop orders-api || true
docker stop orders-app || true
docker rm orders-api || true
docker rm orders-app || true

docker pull ghcr.io/$GHCR_NAMESPACE/${SERVICE_PREFIX}-api:$IMAGE_TAG
docker pull ghcr.io/$GHCR_NAMESPACE/${SERVICE_PREFIX}-app:$IMAGE_TAG

docker network create orders-net || true

docker run -d \
  --name orders-api \
  --network orders-net \
  -e DATABASE_URL="file:./dev.db" \
  ghcr.io/$GHCR_NAMESPACE/${SERVICE_PREFIX}-api:$IMAGE_TAG

docker run -d \
  --name orders-app \
  --network orders-net \
  -p 5757:80 \
  ghcr.io/$GHCR_NAMESPACE/${SERVICE_PREFIX}-app:$IMAGE_TAG
```

- Override `IMAGE_TAG` before running to match the tag produced by `publish-images.sh`.
- Provide a production-grade `DATABASE_URL` instead of the bundled SQLite string when needed.
- The frontend proxies `/api/*` to `orders-api:3000` on the Docker network. If the backend lives elsewhere, export `API_HOST`/`API_PORT` before the `docker run` for `orders-app`.

Run the script:
```bash
chmod +x deploy-containers.sh
GHCR_NAMESPACE=<github-username-or-org> \
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<personal-access-token> \
IMAGE_TAG=<tag-from-build> \
./deploy-containers.sh
```

If you prefer not to pass secrets inline, run `docker login ghcr.io` on the remote host beforehand and omit `GHCR_USERNAME`/`GHCR_TOKEN`.

The API container seeds demo catalog data automatically whenever it starts and the `DATABASE_URL` environment variable is present.

## 4. Verify Deployment
- Visit `http://<your-host>:5757` to confirm the frontend loads and proxies `/api` calls to the backend.
- Check backend logs to ensure migrations and literature loading succeeded:
```bash
docker logs orders-api
```

## 5. Cleanup / Updates
- Stop and remove containers with `docker rm -f orders-app orders-api`.
- Remove old images from GHCR using `docker image rm` locally and the GitHub UI or `gh api` remotely when no longer needed.
- Rebuild and re-run the publish script whenever code changes. Redeploy the frontend to pick up updates to the runtime proxy defaults.
