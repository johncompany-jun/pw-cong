FROM oven/bun:1

WORKDIR /app

# Install dependencies (workspace root + frontend)
COPY package.json bun.lock ./
COPY apps/frontend/package.json ./apps/frontend/
RUN bun install

# Copy frontend source
COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["bun", "run", "vite", "--host", "0.0.0.0"]
