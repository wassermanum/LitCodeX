# syntax=docker/dockerfile:1

FROM node:20-bullseye AS builder
WORKDIR /workspace/api

COPY api/package*.json ./
RUN npm ci

COPY api/prisma ./prisma
RUN npx prisma generate

COPY api/tsconfig.json ./
COPY api/src ./src
COPY api/scripts ./scripts
COPY 234.txt ../234.txt

RUN npm run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /workspace/api
ENV NODE_ENV=production

COPY --from=builder /workspace/api/node_modules ./node_modules
COPY --from=builder /workspace/api/dist ./dist
COPY --from=builder /workspace/api/package*.json ./
COPY --from=builder /workspace/api/prisma ./prisma
COPY --from=builder /workspace/api/scripts ./scripts
COPY --from=builder /workspace/234.txt ../234.txt
COPY api/docker-entrypoint.sh ../docker-entrypoint.sh

RUN chmod +x ../docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["../docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
