import { serve } from './pdf-sandbox.handler';

// ayat-pdf's process (deploy/staging/docker-compose.yml, docs/09 «PDF sandbox»), from the API image:
//   node dist/modules/messaging/inbox/files/pdf/pdf-sandbox.js
// Poppler parses a stranger's PDF here, in a container with no env_file (no secret), no network, a read-only
// root and no capabilities; the API copies reach it only through /run/pdf/pdf.sock. Nothing else imported.

serve().then(
  (server) => {
    process.stdout.write('pdf sandbox listening\n');
    // SIGTERM (forwarded by tini, init: true): finish the render in flight (≤ 20 s, inside the 30 s grace), then exit.
    process.once('SIGTERM', () => server.close(() => process.exit(0)));
  },
  (e: unknown) => {
    process.stderr.write(`pdf sandbox failed to start: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  },
);
