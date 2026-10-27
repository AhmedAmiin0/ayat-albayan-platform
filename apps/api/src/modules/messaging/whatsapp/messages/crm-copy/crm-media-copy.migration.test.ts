import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CRM_MEDIA_PREFIX } from '../crm-history/crm-history-url';

// No database runs in unit tests: this pins migration 880's safety properties.
const dir = join(__dirname, '../../../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261028000891_crm_media_copy.sql'), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const LINK = `m.body like 'https://%${CRM_MEDIA_PREFIX}%'`;

describe('migration 20261028000891: copy every old-CRM file', () => {
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

const retry = readFileSync(join(dir, '20261028000920_crm_media_copy_retry.sql'), 'utf8').replace(/--[^\n]*/g, '');

describe('migration 20261028000920: re-arm on switch-on, remaining on any host', () => {
  it('switching crm_media_copy_all on (insert, or a change to true) deletes only non-skipped failure rows', () => {
    expect(retry).toContain("new.key = 'crm_media_copy_all' and new.value = 'true'::jsonb");
    expect(retry).toContain("tg_op = 'INSERT' or old.value is distinct from new.value");
    expect(retry).toContain('delete from public.crm_media_copy_failures where not skipped;');
    expect(retry).toMatch(/after insert or update of value on public\.settings\s+for each row execute function public\.crm_media_copy_rearm\(\)/);
    expect(retry).toContain('security definer set search_path = \'\'');
    expect(retry).not.toMatch(/update\s+public\.messages|delete\s+from\s+public\.messages/i);
  });

  it('remaining: the batch\'s rows on any host (crm number, mime, one link), no failure row; service role only', () => {
    expect(retry).toContain(`'remaining', (select count(*) from public.messages m`);
    expect(retry).toContain('m.media_id is null and m.media_path is null and m.media_mime is not null');
    expect(retry).toContain(`and m.body like 'https://%${CRM_MEDIA_PREFIX}%'`);
    expect(retry).toContain(`m.body ~ '^https://[^/[:space:]]+${CRM_MEDIA_PREFIX}[^[:space:]]+$'`);
    expect(retry).toContain("n.provider = 'crm'");
    expect(retry).toContain('not exists (select 1 from public.crm_media_copy_failures f where f.message_id = m.id)');
    expect(retry).toContain('revoke all on function public.crm_media_copy_counts(text) from public, anon, authenticated');
    expect(retry).toContain('grant execute on function public.crm_media_copy_counts(text) to service_role');
  });
});
