import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { rewriteText } from '../db-unwrap.mjs';

const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const HTTP = "import { dbError, orNotFound } from '@/common/http/http';\n";
const body = (lines) => `${HTTP}async function f(db) {\n${lines.join('\n')}\n}\n`;
const rewrite = (text, file = 'apps/api/src/x.repo.ts') => rewriteText(project, { file, text });
const read = (query, after = 'return data;') => [
  `  const { data, error } = await ${query};`,
  '  if (error) throw dbError(error);',
  `  ${after}`,
];

test('a list read becomes rows, and the import moves to common/db/errors', () => {
  const out = rewrite(body(read("db.from('t').select('id').eq('a', 1)")));
  assert.match(
    out.text,
    /const data = rows\(await db\.from\('t'\)\.select\('id'\)\.eq\('a', 1\)\);/,
  );
  assert.match(out.text, /^import \{ orNotFound \} from '@\/common\/http\/http';/);
  assert.match(out.text, /import \{ rows \} from '@\/common\/db\/errors';/);
  assert.equal(out.sites, 1);
});

test('maybeSingle becomes maybe, single becomes one, a renamed data keeps its name', () => {
  const a = body([
    "  const { data: a, error } = await db.from('t').select('id').maybeSingle();",
    '  if (error) throw dbError(error);',
  ]);
  const b = body([
    "  const { data: b, error } = await db.from('t').select('id').single();",
    '  if (error) throw dbError(error);',
  ]);
  const out = { text: rewrite(a).text + rewrite(b).text };
  assert.match(out.text, /const a = maybe\(await .*maybeSingle\(\)\);/);
  assert.match(out.text, /const b = one\(await .*\.single\(\)\);/);
});

test('a write whose data is not kept becomes done', () => {
  const out = rewrite(
    body([
      "  const { error } = await db.from('t').delete().eq('id', 1);",
      '  if (error) throw dbError(error);',
    ]),
  );
  assert.match(out.text, /^ {2}done\(await db\.from\('t'\)\.delete\(\)\.eq\('id', 1\)\);$/m);
});

test('an rpc, a head count, a second error use or a comment keeps the if, with pgError', () => {
  for (const lines of [
    read("db.rpc('f', {})"),
    read("db.from('t').select('id', { count: 'exact', head: true })"),
    read("db.from('t').select('id')", 'log(error); return data;'),
    [
      "  const { data, error } = await db.from('t').select('id');",
      '  // why',
      '  if (error) throw dbError(error);',
    ],
  ]) {
    const out = rewrite(body(lines));
    assert.match(out.text, /if \(error\) throw pgError\(error\);/);
    assert.match(out.text, /import \{ pgError \} from '@\/common\/db\/errors';/);
    assert.equal(out.sites, 0);
  }
});

test('a local name equal to a helper blocks that helper only', () => {
  const out = rewrite(
    body([...read("db.from('t').select('id')", 'const rows = data;'), '  return rows;']),
  );
  assert.match(out.text, /if \(error\) throw pgError\(error\);/);
});

test('the guardians copy keeps its answers through peopleErrors, with the explicit code', () => {
  const text = [
    "import { dbError, orSafe } from '@/modules/people/guardians';",
    'async function f(db) {',
    ...read(
      "db.from('t').select('id')",
      "const r = await db.rpc('g', {}); if (r.error) throw dbError(r.error, 'phone_taken');",
    ),
    '}',
  ].join('\n');
  const out = rewrite(text);
  assert.match(out.text, /import \{ orSafe, peopleErrors \} from '@\/modules\/people\/guardians';/);
  assert.match(
    out.text,
    /const data = rows\(await db\.from\('t'\)\.select\('id'\), peopleErrors\(\)\);/,
  );
  assert.match(out.text, /throw pgError\(r\.error, peopleErrors\('phone_taken'\)\);/);
});

test('a dbError used as a type is reported and keeps its import', () => {
  const out = rewrite(`${HTTP}type E = Parameters<typeof dbError>[0];\n`);
  assert.equal(out.unmapped.length, 1);
  assert.match(out.text, /import \{ dbError, orNotFound \} from '@\/common\/http\/http';/);
});

test('files without dbError, or with it from elsewhere, are left alone; a second run is a no-op', () => {
  assert.equal(rewrite('const a = 1;\n').text, 'const a = 1;\n');
  const odd = "import { dbError } from './other';\n";
  assert.equal(rewrite(odd).text, odd);
  assert.equal(rewrite(odd).unmapped.length, 1);
  const once = rewrite(body(read("db.from('t').select('id')"))).text;
  assert.equal(rewrite(once).text, once);
});
