# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts && npm prune --omit=dev --ignore-scripts; \
    npm install --ignore-scripts tsx

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY tsconfig.json tsconfig.server.json ./

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node_modules/.bin/tsx", "server/index.ts"]
