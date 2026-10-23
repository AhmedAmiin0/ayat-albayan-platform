import { describe, expect, it } from 'vitest';
import { isOwnedSettingKey } from './ownership.js';
import { SEED_ENTRIES } from './seed-entries.js';

declare global {
  interface ImportMeta {
    glob<T>(pattern: string | string[], options: { query: '?raw'; import: 'default'; eager: true }): Record<string, T>;
  }
}

const FILES = import.meta.glob<string>('../../../db/supabase/migrations/*_config_describe.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const sql = Object.values(FILES)[0] ?? '';

// The one-time override copy (docs/26 §3) names its (key, hint key) pairs: pinned to the registry.
describe('migration config_describe', () => {
  it('copies exactly the registry hint keys, never a module-owned (send gate, Google) key', () => {
    const pairs = [...sql.matchAll(/\('([a-z0-9_]+)', '([A-Za-z0-9_.]+)'\)/g)].map((m) => [m[1], m[2]]);
    const want = SEED_ENTRIES.filter((e) => e.hintKey && !isOwnedSettingKey(e.key)).map((e) => [e.key, e.hintKey]);
    expect(pairs).toEqual(want);
  });

  it('writes no value: new rows are JSON null and the conflict branch sets only the description', () => {
    const copy = sql.slice(sql.indexOf('with pairs'));
    const update = /on conflict \(key\) do update set([\s\S]*?)where s\.description is null/.exec(copy)?.[1] ?? '';
    expect(update).toContain('description = excluded.description');
    expect(update).not.toMatch(/\bvalue\s*=/);
    expect(copy).toContain("'null'::jsonb");
    expect(sql).not.toMatch(/messaging_enabled|auto_messages_enabled|crm_cutover_done|comms_source|google_sync/);
  });

  it('config_describe is service-role only and checks the 500-character limit', () => {
    expect(sql).toContain('grant execute on function public.config_describe(text, text, text, uuid) to service_role');
    expect(sql).toContain('char_length(p_text) > 500');
  });

  it('never cuts a longer override, and a description-only insert has no writer', () => {
    expect(sql).toContain('where char_length(o.value) <= 500');
    expect(sql).not.toContain('left(o.value');
    expect(sql).toContain("values (p_key, 'null'::jsonb, p_text, p_text is not null)");
  });
});
