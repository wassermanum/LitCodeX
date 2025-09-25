# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /workspace

COPY app/package*.json ./
RUN npm ci

COPY app/ .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext

COPY --from=builder /workspace/dist /usr/share/nginx/html
COPY app/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY app/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
