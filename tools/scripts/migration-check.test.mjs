import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DIR, checkAll, checkNames, lintSql } from './migration-check.mjs';

test('checkNames accepts ordered unique names', () => {
  assert.deepEqual(checkNames(['20261001000001_a.sql', '20261001000002_b.sql']), []);
});

test('checkNames flags a bad name and a duplicate number', () => {
  const e = checkNames(['001_a.sql', '20261001000001_a.sql', '20261001000001_b.sql']);
  assert.equal(e.length, 2);
  assert.match(e[0], /name must be/);
  assert.match(e[1], /duplicate migration number/);
});

test('checkNames flags a new migration older than the latest on base', () => {
  const base = ['20261001000001_a.sql', '20261001000005_c.sql'];
  const e = checkNames([...base, '20261001000003_b.sql'], base);
  assert.equal(e.length, 1);
  assert.match(e[0], /sorts before/);
  assert.deepEqual(checkNames([...base, '20261001000006_d.sql'], base), []);
});

test('lintSql accepts dollar-quoted bodies, strings and comments with odd characters', () => {
  const sql = "-- a ( comment\ncreate function f() returns int as $$ begin return (1; end $$ language plpgsql;\ninsert into t values ('it''s (x');\n";
  assert.deepEqual(lintSql('x.sql', sql), []);
});

test('lintSql flags empty, unbalanced and unterminated SQL', () => {
  assert.match(lintSql('e.sql', '  ')[0], /empty/);
  assert.match(lintSql('p.sql', 'select (1;')[0], /parentheses/);
  assert.match(lintSql('d.sql', 'do $$ begin null; end;')[0], /dollar/);
  assert.match(lintSql('s.sql', "select 'a;")[0], /string/);
  assert.match(lintSql('t.sql', 'select 1')[0], /end with/);
});

test('checkAll only lints added files', () => {
  const read = (f) => (f === 'b.sql' ? 'select (' : '');
  const e = checkAll({ files: ['a.sql', 'b.sql'], baseFiles: ['a.sql'], read });
  assert.ok(e.some((x) => x.startsWith('b.sql: unbalanced')));
  assert.ok(!e.some((x) => x.startsWith('a.sql: empty')));
});

test('the repository migrations have valid, unique, ordered names', () => {
  const files = readdirSync(fileURLToPath(new URL(`../../${DIR}`, import.meta.url))).sort();
  assert.deepEqual(checkNames(files), []);
});
