import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { headerProblems, SCOPES, TYPES } from '../header.ts';

const ok = (header: string): void => assert.deepEqual(headerProblems(header), [], header);
const bad = (header: string, problem: RegExp): void =>
  assert.ok(headerProblems(header).some((p) => problem.test(p)), `${header}: ${headerProblems(header).join('; ')}`);

test('every type with a workspace, area or module scope passes', () => {
  for (const type of TYPES) ok(`${type}(api): change the thing`);
  ok('fix(api/booking): keep the slot when the teacher is away');
  ok('refactor(tools/scripts): split the gate');
  ok('ci(repo): enforce angular commit messages and pr titles');
  ok('build(deps): bump zod');
  ok('docs(staff-web): remove Arabic from code comments (3)');
});

test('a header without the angular shape fails', () => {
  bad('Add the design review skills', /<type>\(<scope>\): <subject>/);
  bad('feat: no scope', /<type>\(<scope>\): <subject>/);
  bad('feat(api):no space', /<type>\(<scope>\): <subject>/);
  bad('feat(api) : spaced', /<type>\(<scope>\): <subject>/);
  bad('feat(api)!: bang', /<type>\(<scope>\): <subject>/);
  bad('', /<type>\(<scope>\): <subject>/);
});

test('an unknown type or scope fails and names the allowed ones', () => {
  bad('feature(api): add it', /type "feature" is not one of feat, fix/);
  bad('Fix(api): add it', /type "Fix"/);
  bad('fix(backend): add it', /scope "backend" is not a workspace or area: api, /);
  bad('fix(API): add it', /scope "API"/);
  bad('fix(api/): add it', /scope "api\/"/);
  bad('fix(api//x): add it', /scope "api\/\/x"/);
  bad('fix(api/Booking): add it', /scope "api\/Booking"/);
});

test('the subject is imperative lower case, with no trailing period or stray spaces', () => {
  bad('fix(api): Add it', /starts lower case/);
  bad('fix(api): 1 more', /starts lower case/);
  bad('fix(api): add it.', /trailing period/);
  bad('fix(api):  add it', /spaces/);
  bad('fix(api): add it ', /spaces/);
});

test('the header is at most 100 characters', () => {
  const prefix = 'fix(api): ';
  ok(prefix + 'a'.repeat(100 - prefix.length));
  bad(prefix + 'a'.repeat(101 - prefix.length), /101 characters, at most 100/);
});

test('every workspace folder has its scope', () => {
  const root = fileURLToPath(new URL('../../../../../../', import.meta.url));
  const folders = ['apps', 'packages'].flatMap((group) =>
    readdirSync(`${root}${group}`, { withFileTypes: true }).filter((d) => d.isDirectory()));
  for (const folder of folders) assert.ok(SCOPES.includes(folder.name), folder.name);
  for (const area of ['e2e', 'tools', 'repo', 'deps']) assert.ok(SCOPES.includes(area), area);
});
