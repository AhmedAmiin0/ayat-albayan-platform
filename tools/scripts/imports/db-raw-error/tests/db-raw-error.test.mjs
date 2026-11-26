import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteText } from '../db-raw-error.mjs';

const DB = "import { DB, type Db } from '@/common/db/db.module';\n";
const ERRORS = "import { maybe, rows } from '@/common/db/errors';\n";
const RAW_GUARD = '  if (error) throw new Error(`r failed: ${error.message}`);';
const file = (head, lines) => `${head}\nasync function f(db: Db) {\n${lines.join('\n')}\n}\n`;

test('a template naming the error becomes pgError, with a new errors import', () => {
  const out = rewriteText(file(DB, [RAW_GUARD]));
  assert.match(out.text, /^ {2}if \(error\) throw pgError\(error\);$/m);
  assert.match(out.text, /^import \{ pgError \} from '@\/common\/db\/errors';$/m);
  assert.equal(out.sites, 1);
  assert.deepEqual(out.unmapped, []);
});

test('a result member, a renamed error and a bare message all map', () => {
  const out = rewriteText(file(DB, [
    '  if (res.error) throw new Error(`${what} read failed: ${res.error.message}`);',
    '  if (readError) throw new Error(`events read failed: ${readError.message}`);',
    '  if (error) throw new Error(error.message);',
  ]));
  assert.match(out.text, /if \(res\.error\) throw pgError\(res\.error\);/);
  assert.match(out.text, /if \(readError\) throw pgError\(readError\);/);
  assert.match(out.text, /if \(error\) throw pgError\(error\);/);
  assert.equal(out.sites, 3);
});

test('pgError joins an existing errors import, sorted, once', () => {
  const out = rewriteText(file(DB + ERRORS, [
    '  if (a) throw new Error(`a failed: ${a.message}`);',
    '  if (b) throw new Error(`b failed: ${b.message}`);',
  ]));
  assert.match(out.text, /^import \{ maybe, pgError, rows \} from '@\/common\/db\/errors';$/m);
  assert.equal(out.text.match(/common\/db\/errors/g)?.length, 1);
});

test('a guard naming another error, a helper and a code check stay and are listed', () => {
  const lines = [
    '  if (error) throw new Error(`x failed: ${other.message}`);',
    "  if (error.code !== '23505') throw new Error(`numbers write failed: ${error.message}`);",
    '  return new Error(`${what} failed: ${error.message}`);',
  ];
  const text = file(DB, lines);
  const out = rewriteText(text);
  assert.equal(out.text, text);
  assert.equal(out.sites, 0);
  assert.deepEqual(out.unmapped.map((u) => u.line), [4, 5, 6]);
});

test('a second run finds nothing', () => {
  const once = rewriteText(file(DB, [RAW_GUARD]));
  const twice = rewriteText(once.text);
  assert.equal(twice.text, once.text);
  assert.equal(twice.sites, 0);
});

test('the new import goes after a multi-line import, never inside it', () => {
  const head = `${DB}import {\n  MESSAGE_SELECT,\n  type Row,\n} from '@/modules/x';\n`;
  const out = rewriteText(file(head, [RAW_GUARD]));
  const after = "} from '@/modules/x';\nimport { pgError } from '@/common/db/errors';\n";
  assert.ok(out.text.includes(after));
});

test('an error typed only as { message: string } is not a PostgrestError: listed, not rewritten', () => {
  const text = file(DB, [
    '  const check = (error: { message: string } | null, what: string) => {',
    '    if (error) throw new Error(`${what} failed: ${error.message}`);',
    '  };',
  ]);
  const out = rewriteText(text);
  assert.equal(out.text, text);
  assert.deepEqual(out.unmapped.map((u) => u.line), [5]);
});
