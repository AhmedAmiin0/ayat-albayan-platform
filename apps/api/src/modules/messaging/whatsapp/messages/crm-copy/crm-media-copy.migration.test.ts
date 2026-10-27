import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CRM_MEDIA_PREFIX } from '../crm-history/crm-history-url';

// No database runs in unit tests: this pins migration 880's safety properties.
const dir = join(__dirname, '../../../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261028000880_crm_media_copy.sql'), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const LINK = `m.body like 'https://%${CRM_MEDIA_PREFIX}%'`;

describe('migration 20261028000880: copy every old-CRM file', () => {
  it('the batch repeats the partial index predicate, so it reads only rows still waiting for a copy', () => {
    expect(code).toContain(`and body like 'https://%${CRM_MEDIA_PREFIX}%'`);
    expect(code).toMatch(/where direction = 'inbound' and media_id is null and media_path is null and media_mime is not null/);
    expect(code).toContain(LINK);
    expect(code).toContain("n.provider = 'crm'");
    expect(code).toContain('f.skipped or f.attempts >= p_max_attempts');
    expect(code).toContain('limit least(greatest(p_limit, 1), 100)');
  });

  it('never updates a message or deletes anything', () => {
    expect(code).not.toMatch(/update\s+public\.messages/i);
    expect(code).not.toMatch(/\bdelete\b(?!\s+on|\s+cascade|,)/i);
  });

  it('RLS on the failures table; the functions are service role only', () => {
    expect(code).toContain('alter table public.crm_media_copy_failures enable row level security');
    for (const fn of ['crm_media_copy_batch(text, int, int)', 'crm_media_copy_mark(uuid, text, boolean)', 'crm_media_copy_counts(text)']) {
      expect(code).toContain(`revoke all on function public.${fn} from public, anon, authenticated`);
      expect(code).toContain(`grant execute on function public.${fn} to service_role`);
    }
  });
});
