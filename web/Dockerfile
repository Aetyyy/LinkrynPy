FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN bun install --production --frozen-lockfile
EXPOSE 4173
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "4173"]
