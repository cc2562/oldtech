FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Payload loads its config during the build. These are inert build-only values;
# production credentials are supplied by Compose when the container runs.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    PAYLOAD_SECRET=build-only-placeholder-secret-32-bytes \
    PREVIEW_SECRET=build-only-preview-secret-32-bytes \
    npm run build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Keep Payload's CLI, TypeScript config, and migrations alongside the Next build.
COPY --from=build /app /app

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "127.0.0.1", "-p", "3000"]
