# API image (docs/09-deployment.md). Build context = repo root:
#   docker build -f apps/api/Dockerfile -t ayat-api .
# Installs only the api workspace and its workspace deps (@ab/shared, @ab/db, @ab/config).
FROM node:24.15.0-slim AS build
ENV CI=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "api..." \
 && pnpm --filter @ab/shared build \
 && pnpm --filter api build

FROM node:24.15.0-slim
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build --chown=node:node /repo /repo
# Report PDFs (R-REP-03): the headless Chromium that playwright-core 1.63 pins, its system
# libraries, and Amiri as the Arabic fallback font. The PDF embeds its own Amiri + IBM Plex Sans
# Arabic (@fontsource), so the fallback only covers a glyph those subsets lack.
# ffmpeg (Debian's, built with libopus): a voice note recorded in the app (m4a) becomes WhatsApp's
# ogg/opus voice note (owner 2026-10-27, inbox/files/voice-ogg.ts); without it the m4a goes as plain audio.
RUN node /repo/apps/api/node_modules/playwright-core/cli.js install --with-deps --only-shell chromium \
 && apt-get update \
 && apt-get install -y --no-install-recommends fonts-hosny-amiri ffmpeg \
 && rm -rf /var/lib/apt/lists/*
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
