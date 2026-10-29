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
# poppler-utils: page images of a chat PDF (owner 2026-10-29, inbox/files/pdf/pdf-render.ts), each run as
# nice + choom + prlimit (util-linux, named because the node tag does not pin the Debian release) under a
# SIGKILL timeout. The smoke step renders a one-page PDF through that exact chain, env and pdftoppm flags
# (pdf-pages.ts pdftoppmArgs: change both together), so a missing tool, flag or a too-small address
# space fails the image build, never a family's first PDF.
RUN node /repo/apps/api/node_modules/playwright-core/cli.js install --with-deps --only-shell chromium \
 && apt-get update \
 && apt-get install -y --no-install-recommends fonts-hosny-amiri ffmpeg poppler-utils util-linux \
 && rm -rf /var/lib/apt/lists/*
RUN printf '%s\n' '%PDF-1.4' \
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj' \
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj' \
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 72 72]>>endobj' \
      'xref' '0 4' '0000000000 65535 f ' '0000000009 00000 n ' '0000000052 00000 n ' '0000000101 00000 n ' \
      'trailer<</Size 4/Root 1 0 R>>' 'startxref' '162' '%%EOF' > /tmp/smoke.pdf \
 && env -i PATH=/usr/bin:/bin nice -n 10 choom -n 1000 -- prlimit --as=268435456 -- pdfinfo /tmp/smoke.pdf | grep -q '^Pages: *1$' \
 && env -i PATH=/usr/bin:/bin nice -n 10 choom -n 1000 -- prlimit --as=268435456 -- \
      pdftoppm -jpeg -jpegopt quality=70 -scale-to 1600 -f 1 -l 1 /tmp/smoke.pdf /tmp/smoke \
 && test -s /tmp/smoke-1.jpg \
 && rm -f /tmp/smoke.pdf /tmp/smoke-1.jpg
# Those runs happen in ayat-pdf on staging (docs/09 «PDF sandbox»), never in an API copy. Its socket folder: a
# fresh pdf-sock volume mounted here takes this owner and mode, so ayat-pdf (uid node) listens and the API
# copies (uid node too) connect; nobody else.
RUN install -d -o node -g node -m 0700 /run/pdf
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
