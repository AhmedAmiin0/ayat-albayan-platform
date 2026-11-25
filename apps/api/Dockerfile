# API image (docs/09-deployment.md). Build context = repo root:
#   docker build -f apps/api/Dockerfile -t ayat-api .
# Stages from the slowest-changing to the fastest, so a deploy that changes only source code rebuilds
# only «build» and the last COPY (the VPS keeps its own docker build cache; CI uses the GitHub cache):
#   runtime-base  apt + the Chromium of playwright-core, keyed only on the node tag, PLAYWRIGHT_CORE
#                 and the apt package list
#   manifests     pnpm-lock.yaml, pnpm-workspace.yaml, .npmrc, patches/ and the package.json files
#   deps          pnpm fetch + an offline install of "api...", keyed only on «manifests»
#   build         the source; the api bundled into dist/ (apps/api/rolldown.config.mjs: one file per
#                 entry, the workspace packages compiled from their TypeScript source, so no package
#                 is built); then the dev dependencies pruned (pnpm's own --prod install). The repo
#                 layout stays as it was: pdf-assets.ts reads @ab/catalog's brand/mark.png
# The pnpm store lives in a BuildKit cache mount (never in a layer): a lockfile change downloads only
# the new packages. Measured in CI (job «image», cold): runtime-base 50 s and deps 45 s, both skipped
# by a source-only change; the build 30 s, the prod install 10 s and the final COPY 7 s. Any
# workspace package.json (even an app the api never imports) reruns «deps»: pnpm needs them all.

# Report PDFs (R-REP-03): the headless Chromium that playwright-core pins, its system libraries, and
# Amiri as the Arabic fallback font. The PDF embeds its own Amiri + IBM Plex Sans Arabic
# (@fontsource), so the fallback only covers a glyph those subsets lack.
# ffmpeg (Debian's, built with libopus): a voice note recorded in the app (m4a) becomes WhatsApp's
# ogg/opus voice note (owner 2026-10-27, inbox/files/voice-ogg.ts); without it the m4a goes as plain
# audio. poppler-utils: page images of a chat PDF (owner 2026-10-29, inbox/files/pdf/pdf-render.ts),
# each run as nice + choom + prlimit (util-linux, named because the node tag does not pin the Debian
# release) under a SIGKILL timeout.
FROM node:24.15.0-slim AS runtime-base
# Equal to apps/api's playwright-core in pnpm-lock.yaml (ci-checks/docker/api-image.test.mjs): the
# browser build is the one that version pins, as when it was installed from the api's node_modules.
ARG PLAYWRIGHT_CORE=1.63.0
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y "playwright-core@${PLAYWRIGHT_CORE}" install --with-deps --only-shell chromium \
 && apt-get update \
 && apt-get install -y --no-install-recommends fonts-hosny-amiri ffmpeg poppler-utils util-linux \
 && rm -rf /var/lib/apt/lists/* /root/.npm
# The smoke step renders a one-page PDF through the exact chain, env and pdftoppm flags of
# pdf-pages.ts pdftoppmArgs (change both together), so a missing tool, flag or a too-small address
# space fails the image build, never a family's first PDF.
RUN printf '%s\n' '%PDF-1.4' \
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj' \
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj' \
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 72 72]>>endobj' \
      'xref' '0 4' '0000000000 65535 f ' '0000000009 00000 n ' '0000000052 00000 n ' \
      '0000000101 00000 n ' 'trailer<</Size 4/Root 1 0 R>>' 'startxref' '162' '%%EOF' \
      > /tmp/smoke.pdf \
 && env -i PATH=/usr/bin:/bin nice -n 10 choom -n 1000 -- prlimit --as=268435456 -- \
      pdfinfo /tmp/smoke.pdf | grep -q '^Pages: *1$' \
 && env -i PATH=/usr/bin:/bin nice -n 10 choom -n 1000 -- prlimit --as=268435456 -- \
      pdftoppm -jpeg -jpegopt quality=70 -scale-to 1600 -f 1 -l 1 /tmp/smoke.pdf /tmp/smoke \
 && test -s /tmp/smoke-1.jpg \
 && rm -f /tmp/smoke.pdf /tmp/smoke-1.jpg
# Those runs happen in ayat-pdf on staging (docs/09 «PDF sandbox»), never in an API copy. Its socket
# folder: the pdf-sock tmpfs mounted here sets the same owner (uid 1000 = node) and mode itself, so
# ayat-pdf listens and the API copies (uid node too) connect; nobody else.
RUN install -d -o node -g node -m 0700 /run/pdf

# What pnpm needs to install, nothing else: the source never invalidates the install below.
FROM node:24.15.0-slim AS manifests
WORKDIR /repo
RUN --mount=type=bind,target=/ctx cd /ctx \
 && cp --parents package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /repo \
 && cp -r --parents patches /repo \
 && for f in apps/*/package.json packages/*/package.json tools/*/package.json \
      e2e/package.json docs/design/brand/tools/package.json; do cp --parents "$f" /repo; done

FROM node:24.15.0-slim AS deps
ENV CI=true
WORKDIR /repo
COPY --from=manifests /repo/package.json ./
# pnpm itself (packageManager in package.json), downloaded once into this layer.
RUN corepack enable && corepack install
COPY --from=manifests /repo ./
RUN --mount=type=cache,id=ayat-pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store \
 && pnpm install --offline --frozen-lockfile --store-dir /pnpm/store --filter "api..."

FROM deps AS build
# pnpm 11 checks the install before a run and reinstalls when a package.json is newer than it. The VPS
# copies the source from `git archive` (commit-time mtimes) onto a «deps» layer cached from an earlier
# deploy, so every build reinstalled all 1510 packages from the network, with no store mount (~105 of
# the build's 181 s, deploy 44059967409). «deps» is the exact install (frozen lockfile, «manifests»
# only) and nothing below may change it, so the check is off here.
ENV pnpm_config_verify_deps_before_run=false
COPY . .
RUN pnpm --filter api build
# A fresh production install (a --prod install over the full one would keep every dev package in
# node_modules/.pnpm): 609 MB of node_modules become 278 MB. --prefer-offline, not --offline: «deps»
# may come from the layer cache while the store mount is empty (CI's GitHub cache never holds
# mounts; BuildKit may evict one on its own), and then the missing packages are downloaded.
RUN --mount=type=cache,id=ayat-pnpm-store,target=/pnpm/store \
    find . -name node_modules -type d -prune -exec rm -rf {} + \
 && pnpm install --prefer-offline --frozen-lockfile --prod --store-dir /pnpm/store --filter "api..."

FROM runtime-base
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
