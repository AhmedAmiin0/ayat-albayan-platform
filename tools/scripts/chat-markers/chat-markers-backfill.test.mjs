import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs, report, run } from './chat-markers-backfill.mjs';
import { ROWS } from './chat-markers.fixture.mjs';
import { planAll, planRow } from './markers-plan.mjs';
import { buildSql, EXPORT_SQL } from './markers-sql.mjs';

const plan = planAll(ROWS);
const byId = (n) => plan.updates.find((u) => u.id.endsWith(n));

test('plan: only outbound external rows whose body is exactly a placeholder', () => {
  assert.equal(plan.counts.candidates, 10);
  for (const n of ['11', '12', '13', '14']) assert.equal(byId(n), undefined);
  assert.deepEqual(plan.counts.byType, {
    edit: 2, revoke: 1, reaction: 1, image: 1, audio: 1, document: 1,
    errors: 1, unsupported: 1, location: 1,
  });
});

test('plan: an edit / revoke with a stored context id applies to its original; the rest are hidden', () => {
  assert.deepEqual(byId('01').payload, { type: 'edit', marker: true, target: 'wamid.ORIGINAL1', text: null });
  assert.deepEqual(byId('01').apply, { phone: '+966501234567', target: 'wamid.ORIGINAL1' });
  assert.equal(byId('02').kind, 'hidden');
  assert.equal(byId('02').payload.unresolved, true);
  assert.equal(byId('04').kind, 'hidden');
  assert.equal(byId('04').payload.type, 'reaction');
  assert.equal(byId('04').apply, null);
});

test('plan: files keep the file without a caption; errors and unsupported become their notes', () => {
  assert.deepEqual([byId('05').kind, byId('05').mime], ['file', 'image/jpeg']);
  assert.deepEqual([byId('06').kind, byId('06').mime], ['file', 'audio/ogg']);
  assert.deepEqual([byId('07').kind, byId('07').mime], ['file_missing', null]);
  assert.deepEqual(byId('08').payload, { type: 'errors', errors: null, welcome: null });
  assert.deepEqual(byId('09').payload, { type: 'unsupported' });
  assert.deepEqual(byId('10').payload, { type: 'location' });
  assert.equal(planRow({ ...ROWS[0], body: 'hello' }), null);
});

test('dry run: counts only, never a phone, an id or a text; no SQL', () => {
  const out = run({ file: 'm.json', dryRun: true, export: false }, () => JSON.stringify(ROWS));
  assert.match(out, /rows read: 14, to fix: 10/);
  assert.match(out, /\[edit\]: 2/);
  assert.match(out, /hidden: 2/);
  assert.match(out, /originals to mark .*: 2/);
  assert.doesNotMatch(out, /\+966|wamid|0000-4000|update|begin/);
  assert.equal(out, report(plan));
});

test('sql: one transaction, each update guarded by its placeholder (re-runnable), quotes escaped', () => {
  const sql = buildSql(plan.updates, { commit: true });
  assert.match(sql, /^-- .*\nbegin;\n/);
  assert.match(sql, /commit;\n$/);
  assert.equal((sql.match(/^update public\.messages set body = null/gm) ?? []).length, 10);
  assert.equal((sql.match(/and body = '\[[a-z]+\]';/g) ?? []).length, 10);
  assert.match(sql, /message_markers_apply\('\+966501234567', 'wamid\.O''2', '-infinity'\)/);
  assert.match(sql, /media_mime = coalesce\(media_mime, 'audio\/ogg'\)/);
  assert.match(sql, /thread_summary_refresh_all\(array\['\+966501234567'\]\)/);
  assert.match(buildSql([], { commit: false }), /begin;\nrollback;\n$/);
});

test('cli: --export prints the read-only select; a file is required otherwise', () => {
  assert.deepEqual(parseArgs(['m.json', '--dry-run']), { file: 'm.json', dryRun: true, export: false });
  const exported = run({ file: null, dryRun: false, export: true }, () => '');
  assert.equal(exported, `${EXPORT_SQL};\n`);
  assert.doesNotMatch(exported, /update|insert|delete/i);
  assert.throws(() => run({ file: null, dryRun: true, export: false }, () => ''), /usage/);
});
