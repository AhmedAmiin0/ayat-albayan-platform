// Each file the image or the deploy runs as `node dist/<name>.js` (Dockerfile CMD, the ayat-pdf
// command in deploy/staging, the operator scripts of docs/09 and docs/45). One bundle each.
const NAMES = [
  'main',
  'modules/messaging/inbox/files/pdf/pdf-sandbox',
  'scripts/config-import-env',
  'scripts/storage-copy',
  'scripts/storage-move',
  'scripts/minio-drive-restore',
];

export const ENTRIES = Object.fromEntries(NAMES.map((name) => [name, `src/${name}.ts`]));
