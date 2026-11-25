import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENTRIES } from '../entries.mjs';

const api = join(import.meta.dirname, '../..');

describe('ENTRIES', () => {
  it('keeps every path the image and the deploy run (dist/<path>.js)', () => {
    expect(Object.keys(ENTRIES)).toEqual(
      expect.arrayContaining([
        'main',
        'modules/messaging/inbox/files/pdf/pdf-sandbox',
        'scripts/config-import-env',
        'scripts/storage-copy',
        'scripts/storage-move',
        'scripts/minio-drive-restore',
      ]),
    );
  });

  it('points each one at a source file that exists', () => {
    for (const [name, file] of Object.entries(ENTRIES)) {
      expect(file, name).toBe(`src/${name}.ts`);
      expect(existsSync(join(api, file)), file).toBe(true);
    }
  });
});
