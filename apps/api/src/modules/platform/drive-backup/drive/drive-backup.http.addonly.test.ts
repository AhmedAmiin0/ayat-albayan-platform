import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DriveBackupHttp } from './drive-backup.http';

// Owner 2026-11-07: the backup is ADD-ONLY. The real Drive adapter has no way to delete, trash or
// change a file: only POST (a folder, an upload session), PUT (upload chunks) and GETs.

const source = readFileSync(join(__dirname, 'drive-backup.http.ts'), 'utf8');

describe('the Drive adapter is add-only', () => {
  it('sends no DELETE and no PATCH, and never sets trashed', () => {
    const methods = [...source.matchAll(/method: '([A-Z]+)'/g)].map((m) => m[1]);
    expect([...new Set(methods)].sort()).toEqual(['POST', 'PUT']);
    expect(source).not.toMatch(/DELETE|PATCH|trashed: true|emptyTrash/);
  });

  it('has no remove / trash / update method at all', () => {
    const names = Object.getOwnPropertyNames(DriveBackupHttp.prototype);
    expect(names.filter((n) => /remove|delete|trash|update|setProp/i.test(n))).toEqual([]);
  });
});
