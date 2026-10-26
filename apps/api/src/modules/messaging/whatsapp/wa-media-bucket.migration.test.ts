import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INVOICE_MIMES, PLAYABLE_MAX_BYTES, PLAYABLE_MIMES } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// docs/21 §2.5: the wa-media bucket takes every type the chat caches. No database runs in unit
// tests: this pins the SQL, so a mime added to PLAYABLE_MIMES without the bucket fails here, not as
// a Storage 4xx on a family's first voice note of that type.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261019000500_wa_media_audio_video.sql'), 'utf8');
const allowed = sql.match(/allowed_mime_types = array\[([^\]]*)\]/)?.[1] ?? '';

describe('migration 20261019000500: wa-media takes voice notes and videos', () => {
  it('allows every image/PDF and every playable type', () => {
    for (const m of [...INVOICE_MIMES, ...PLAYABLE_MIMES]) expect(allowed).toContain(`'${m}'`);
  });

  it('raises the bucket cap to the playable limit, on wa-media only', () => {
    expect(sql).toContain(`file_size_limit = ${PLAYABLE_MAX_BYTES}`);
    expect(sql).toContain("where id = 'wa-media'");
  });

  it('indexes the purge scan', () => {
    expect(sql).toContain('create index if not exists messages_media_cached_idx');
  });
});
