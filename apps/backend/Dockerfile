FROM oven/bun:1

WORKDIR /app

# Install dependencies (workspace root + backend)
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install

# Copy backend source
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["bun", "run", "--watch", "src/index.ts"]
