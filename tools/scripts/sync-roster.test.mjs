import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('./sync-roster.sql', import.meta.url), 'utf8');
const code = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');

test('runs in one transaction and ends with ROLLBACK until the owner changes it', () => {
  assert.match(code.trim(), /^begin;/);
  assert.match(code.trim(), /rollback;$/);
  assert.equal(/\bcommit\s*;/i.test(code), false);
});

test('lists every student of the owner roster for the three teachers', () => {
  for (const name of ['مرام يحيى', 'أم جودى', 'جودى', 'سهيلة', 'صباح', 'حواء يحيى', 'رانيا الجهني', 'أم إيمان', 'وفاء قدس', 'أم مشاري', 'أم أحمد', 'رغد', 'ماريا', 'علياء المحمدي', 'أمل جاسم', 'ثمراء الحامد']) {
    assert.ok(sql.includes(`'${name}'`), name);
  }
  for (const teacher of ['أبرار', 'ربيعة', 'هند', 'أسماء حسين']) assert.ok(sql.includes(`'${teacher}'`), teacher);
});

test('weekday numbers follow byday (0 = Sunday): مرام is Sat, Tue, Thu', () => {
  assert.match(sql, /'مرام يحيى',\s+'\{6,2,4\}'/);
  assert.match(sql, /'حواء يحيى',\s+'\{0,2,4\}'/);
});

test('never deletes and only writes students.status; unlisted students are paused only behind the flag', () => {
  assert.equal(/\bdelete\s+from\b/i.test(code), false);
  const updates = [...code.matchAll(/update\s+public\.(\w+)/gi)].map((m) => m[1]);
  assert.deepEqual([...new Set(updates)], ['students']);
  assert.match(code, /select false as apply_unlisted/);
});

test('refuses to guess: a teacher or a name that matches 0 or many is reported, not applied', () => {
  assert.match(code, /raise exception 'roster row/);
  assert.match(code, /where p\.n = 1 and s\.id = p\.student_id/);
});

test('أسماء حسين: علياء Sun/Mon/Tue 3 pm, أمل Sun/Tue/Thu 11 am, ثمراء Wed 11 am', () => {
  assert.match(sql, /'علياء المحمدي',\s+'\{0,1,2\}',\s+'15:00'/);
  assert.match(sql, /'أمل جاسم',\s+'\{0,2,4\}',\s+'11:00'/);
  assert.match(sql, /'ثمراء الحامد',\s+'\{3\}',\s+'11:00'/);
});

test('answers "am I missing a subscribed student": active or scheduled students off the roster, any teacher', () => {
  assert.match(sql, /STEP 3c/);
  assert.match(code, /roster name\(s\) were NOT found/);
  assert.equal(/\bdelete\s+from\b/i.test(code), false);
});
