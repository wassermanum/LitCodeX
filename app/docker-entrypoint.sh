#!/usr/bin/env sh
set -eu

API_HOST=${API_HOST:-orders-api}
API_PORT=${API_PORT:-3000}

export API_HOST API_PORT

envsubst '${API_HOST} ${API_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
