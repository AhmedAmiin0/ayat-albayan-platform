// The one-off fix script must stay reviewable and safe: rollback by default, guarded name matches,
// only the intended tables, re-pricing before settlement.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('./fix-teacher-data.sql', import.meta.url), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

test('defaults to ROLLBACK and never commits as written', () => {
  const last = code.trim().split('\n').pop();
  assert.equal(last.trim(), 'rollback;');
  assert.doesNotMatch(code, /^\s*commit\s*;/im);
  assert.match(code, /^\s*begin\s*;/im);
});

test('refuses a name matching 0 or more than 1 student', () => {
  assert.match(code, /if n <> 1 then\s+raise exception/);
  assert.match(code, /need exactly 1/);
  assert.match(code, /تولين/);
  assert.match(code, /صباح الحبيب/);
});

test('only touches the intended tables and deletes nothing', () => {
  const writes = new Set();
  for (const m of code.matchAll(/(?<!for )\b(?:update|insert into|delete from)\s+(?:only\s+)?(?:public\.)?(\w+)/gi)) writes.add(m[1]);
  const allowed = ['students', 'schedule_rules', 'lessons', 'lesson_students', 'audit_log', 'teacher_session_earnings', 'fix_target', 'fix_report'];
  for (const t of writes) assert.ok(allowed.includes(t), `unexpected write to ${t}`);
  assert.doesNotMatch(code, /\bdelete\s+from\b|\btruncate\b|\bdrop\s+table\b/i);
});

test('ends rules and cancels only open lessons, never completed ones', () => {
  assert.match(code, /status in \('scheduled', 'confirmed'\)/);
  assert.match(code, /'cancelled_by_admin'/);
  assert.match(code, /set status = 'churned'|status = 'churned'/);
  assert.match(code, /v_tue = any \(sr\.byday\)/);
  assert.match(code, /extract\(dow from l\.starts_at at time zone r\.tz\) = v_tue/);
});

test('cutover variable and 45 -> rate_60 re-pricing guarded by starts_at < cutover, before settlement', () => {
  assert.match(code, /date '2026-10-03' as cutover_date/);
  assert.match(code, /'Asia\/Riyadh'/);
  const reprice = code.search(/set rate = t\.rate_60, amount = t\.rate_60/);
  assert.ok(reprice > 0);
  const stmt = code.slice(reprice, code.indexOf(';', reprice));
  assert.match(stmt, /e\.minutes = 45/);
  assert.match(stmt, /e\.starts_at < c\.cutover_at/);
  assert.match(stmt, /e\.status <> 'paid'/);
  assert.match(stmt, /t\.rate_60 is not null/);
  assert.match(stmt, /earning_status\(e\.paid_amount/);
  assert.ok(reprice < code.indexOf('record_teacher_payment'), 're-price must precede settlement');
});

test('settlement uses the RPC with a deterministic request id and the legacy note', () => {
  assert.match(code, /perform public\.record_teacher_payment/);
  assert.match(code, /md5\('legacy-settlement-'/);
  assert.match(code, /legacy settlement: academy confirmed all teachers paid/);
});
