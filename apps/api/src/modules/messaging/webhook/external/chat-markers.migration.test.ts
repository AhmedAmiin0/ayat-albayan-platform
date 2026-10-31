import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261030000992 (chat markers) read as text: expand only and re-runnable. The rows are
// proven in e2e/tests/messaging/chat-markers.sql.spec.ts (a real database).
const dir = MIGRATIONS_DIR;
const NAME = '20261030000992_chat_markers.sql';
const SQL = readFileSync(join(dir, NAME), 'utf8').replace(/--.*$/gm, '');
/** Outside the function bodies: what the migration itself runs. */
const TOP = SQL.replace(/\$\$[\s\S]*?\$\$/g, '');

describe('migration 20261030000992: chat markers', () => {
  it('sorts after every migration before it (develop through 984)', () => {
    const all = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(all.indexOf(NAME)).toBeGreaterThan(all.indexOf('20261030000984_calls_number.sql'));
  });

  it('only adds: nullable columns, an index, functions and a trigger; no row is written', () => {
    expect(SQL).toContain('add column if not exists edited_at timestamptz');
    expect(SQL).toContain('add column if not exists deleted_at timestamptz');
    expect(SQL).not.toMatch(/drop column|drop table|truncate|delete from public\.messages/i);
    expect(TOP).not.toMatch(/\b(update|insert into|select) public\.messages/i);
    expect(SQL).not.toMatch(/create (function|view|index)\b(?! if not exists)/);
    expect(SQL).toContain('drop trigger if exists messages_markers_on_insert on public.messages');
  });

  it('hides the three marker types everywhere message_is_reaction is read', () => {
    expect(SQL).toContain("p ->> 'type' in ('reaction', 'edit', 'revoke')");
    expect(SQL.match(/not public\.message_is_reaction\(m\.interactive_payload\)/g)).toHaveLength(2);
  });

  it('applies only markers of the same phone, never fails the insert', () => {
    expect(SQL).toContain('where m.phone_e164 = p_phone');
    expect(SQL).toContain('where x.wa_message_id = p_wamid and x.phone_e164 = p_phone');
    expect(SQL).toContain("now() - interval '7 days'");
    expect(SQL).toMatch(/exception when others then\s+raise warning/);
  });
});
