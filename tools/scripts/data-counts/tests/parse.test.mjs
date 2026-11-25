import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCounts } from '../parse.mjs';
import { fixture, rejectedCases } from './fixtures.mjs';

test('parse: named count statements, one or many lines, comments and blank lines skipped', () => {
  assert.deepEqual(parseCounts(fixture('valid')), [
    {
      name: 'payments_amount_null',
      sql: 'select count(*) from payments where amount_minor is null',
    },
    {
      name: 'payments_status_unknown',
      sql: "select count(*) from public.payments where status::text not in ('pending', 'paid', 'refunded')",
    },
    { name: 'payments_total', sql: 'select count(*) from payments' },
  ]);
});

for (const { name, text } of rejectedCases()) {
  test(`parse: rejects ${name}`, () => {
    assert.throws(() => parseCounts(text), /statement 1 is not a plain count/);
  });
}

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
