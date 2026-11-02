import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261031000995 (a reply that arrives before the message it quotes) read as text: expand
// only and re-runnable. The rows are proven in e2e/tests/messaging/reply-late-link.sql.spec.ts.
const NAME = '20261031000995_reply_late_link.sql';
const SQL = readFileSync(migrationPath(NAME), 'utf8').replace(/--.*$/gm, '');
/** Outside the function body: what the migration itself runs. */
const TOP = SQL.replace(/\$\$[\s\S]*?\$\$/g, '');
const BODY = /\$\$([\s\S]*?)\$\$/.exec(SQL)?.[1] ?? '';

describe('migration 20261031000995: replies linked when their quoted row lands later', () => {
  it('sorts after every migration before it (develop through 994)', () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(NAME)).toBeGreaterThan(all.indexOf('20261031000994_template_samples.sql'));
  });

  it('only adds: an index, a function and a trigger, all re-runnable', () => {
    expect(SQL).not.toMatch(/drop (column|table|index)|truncate|delete from|alter table/i);
    expect(SQL).toContain('create index if not exists messages_reply_waiting_idx');
    expect(SQL).toContain('create or replace function public.messages_link_waiting_replies()');
    expect(SQL).toContain('drop trigger if exists messages_link_waiting_replies on public.messages');
    expect(SQL).toMatch(/after insert or update of wa_message_id on public\.messages\s+for each row when \(new\.wa_message_id is not null\)/);
  });

  it('links only waiting replies of the same phone, sets only reply_to_message_id, never loops', () => {
    expect(BODY).toMatch(/if exists \([\s\S]*\) then\s+update public\.messages r/);
    expect(BODY.match(/r\.phone_e164 = new\.phone_e164 and r\.reply_to_wa_id = new\.wa_message_id/g)).toHaveLength(2);
    expect(BODY.match(/r\.reply_to_message_id is null and r\.id <> new\.id/g)).toHaveLength(2);
    expect(BODY).toMatch(/set reply_to_message_id = new\.id\s+where/);
    expect(BODY.match(/\bset\b/g)).toHaveLength(1);
    expect(SQL).toContain("set search_path = ''");
  });

  it('backfills once: only replies with no link yet, to a quoted row of the same phone', () => {
    expect(TOP).toMatch(
      /update public\.messages m\s+set reply_to_message_id = q\.id\s+from public\.messages q\s+where m\.reply_to_message_id is null/,
    );
    expect(TOP).toContain('q.phone_e164 = m.phone_e164');
  });
});
