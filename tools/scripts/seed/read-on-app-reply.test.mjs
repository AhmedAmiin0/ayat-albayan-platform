// The one-off read backfill must stay safe: rollback by default, only messages.read_at written,
// only inbound rows answered by a LATER external (app / CRM) reply on the same phone.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('./read-on-app-reply.sql', import.meta.url), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

test('defaults to ROLLBACK and never commits as written', () => {
  assert.equal(code.trim().split('\n').pop().trim(), 'rollback;');
  assert.doesNotMatch(code, /^\s*commit\s*;/im);
  assert.match(code, /^\s*begin\s*;/im);
});

test('counts first (dry run), then writes only messages.read_at, deleting nothing', () => {
  assert.ok(code.indexOf('raise notice') < code.indexOf('update messages'));
  const writes = [...code.matchAll(/\b(?:update|insert into|delete from)\s+(\w+)/gi)].map((m) => m[1]);
  assert.deepEqual(writes, ['messages']);
  assert.match(code, /set read_at = least\(a\.reply_at, now\(\)\)/);
  assert.doesNotMatch(code, /\bdelete\s+from\b|\btruncate\b|\bdrop\s+table\b/i);
});

test('only unread inbound rows answered by a later external reply on the same phone', () => {
  assert.match(code, /i\.direction = 'inbound'\s+and i\.read_at is null/);
  assert.match(code, /o\.phone_e164 = i\.phone_e164/);
  assert.match(code, /o\.direction = 'outbound'/);
  assert.match(code, /o\.created_by is null/);
  assert.match(code, /o\.attempts = 0/);
  assert.match(code, /o\.wa_message_id is not null/);
  assert.match(code, /o\.status in \('sent', 'delivered', 'read'\)/);
  assert.match(code, /o\.dedup_key is null/);
  assert.match(code, /o\.template_key is distinct from 'account_code'/);
  assert.match(code, /i\.created_at < date_trunc\('second', o\.created_at\)/);
  assert.match(code, /and m\.read_at is null;/);
});
