import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCounts } from '../parse.mjs';
import { fixture, rejectedCases } from './fixtures.mjs';

test('parse: named counts on a table in public; comments and blank lines skipped', () => {
  assert.deepEqual(parseCounts(fixture('valid')), [
    {
      name: 'payments_amount_null',
      sql: 'select count(*) from public.payments where amount_minor is null',
    },
    {
      name: 'payments_status_unknown',
      sql: "select count(*) from public.payments where status::text not in ('pending', 'paid', 'refunded')",
    },
    { name: 'payments_total', sql: 'select count(*) from public.payments' },
  ]);
});

for (const { name, text } of rejectedCases()) {
  test(`parse: rejects ${name}`, () => {
    assert.throws(() => parseCounts(text), /statement 1 is not a plain count/);
  });
}

test('parse: a string may hold quotes, semicolons and any script', () => {
  const where = "status not in ('it''s', 'a;b -- c', 'نشط')";
  const items = parseCounts(`-- count: odd\nselect count(*) from t where ${where};`);
  assert.deepEqual(items, [{ name: 'odd', sql: `select count(*) from public.t where ${where}` }]);
});

test('parse: a bare table name is sent as a table in public, whatever else has that name', () => {
  const [item] = parseCounts('-- count: roles\nselect count(*) from pg_authid;');
  assert.equal(item.sql, 'select count(*) from public.pg_authid');
});

test('parse: a word that only looks like a keyword function is a plain name', () => {
  const where = "user_id is null and role = 'user' and note = 'current_user'";
  assert.equal(parseCounts(`-- count: names\nselect count(*) from t where ${where};`).length, 1);
});

test('parse: a decimal, a dotted string and a clause word inside a name stay legal', () => {
  const where = "amount > 1.5 and note = 'a.b' and order_id is null and format = 'group'";
  assert.equal(parseCounts(`-- count: plain\nselect count(*) from t where ${where};`).length, 1);
});

test('parse: a counts file has a size limit', () => {
  const text = `-- count: a\nselect count(*) from t;\n${' '.repeat(65_536)}`;
  assert.throws(() => parseCounts(text), /counts file is too long/);
});

test('parse: a statement needs a «-- count: <name>» line before it', () => {
  assert.throws(() => parseCounts(fixture('unnamed')), /statement 1 has no name/);
});

test('parse: names are unique', () => {
  assert.throws(() => parseCounts(fixture('duplicate')), /statement 2 repeats the name students/);
});

test('parse: the last statement ends with a semicolon', () => {
  assert.throws(() => parseCounts(fixture('unterminated')), /statement 1 does not end with ;/);
});

test('parse: an empty file has nothing to count', () => {
  assert.throws(() => parseCounts(fixture('empty')), /no count statements/);
});

test('parse: an error names the statement, never echoes its text', () => {
  assert.throws(
    () =>
      parseCounts(
        "-- count: x\nselect count(*) from t where a = 'secret';\n-- count: y\nselect 1;",
      ),
    (error) => {
      assert.equal(error.message, 'statement 2 is not a plain count');
      return true;
    },
  );
});
