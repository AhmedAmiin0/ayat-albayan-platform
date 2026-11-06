import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261106000601 (docs/19) read as text: app_send_adopt keeps what pointed at the
// external row it deletes (replies, forwards) and the contact's reaction on it.
const FILE = '20261106000601_app_send_adopt.sql';
const SQL = readFileSync(join(MIGRATIONS_DIR, FILE), 'utf8')
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ');
const at = (text: string): number => SQL.indexOf(text);
const DELETE = 'delete from public.messages where id = ext.id;';

describe('migration 20261106000601: app_send_adopt', () => {
  it('re-runs safely: create or replace, service role only', () => {
    expect(SQL.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
    expect(SQL).toContain('create or replace function public.app_send_adopt(p_held uuid, p_external');
    expect(SQL).toContain('grant execute on function public.app_send_adopt(uuid, uuid) to service_role');
  });

  it('moves replies and forwards of the external row onto the held row before the delete', () => {
    const moved = (col: string): number =>
      at(`update public.messages set ${col} = p_held where ${col} = ext.id and id <> p_held;`);
    const reply = moved('reply_to_message_id');
    const fwd = moved('forwarded_from_id');
    expect(reply).toBeGreaterThan(0);
    expect(fwd).toBeGreaterThan(0);
    expect(at(DELETE)).toBeGreaterThan(Math.max(reply, fwd));
  });

  it("keeps the contact's reaction: the held row's, else the external row's", () => {
    expect(SQL).toContain('their_reaction = coalesce(their_reaction, ext.their_reaction),');
  });
});
