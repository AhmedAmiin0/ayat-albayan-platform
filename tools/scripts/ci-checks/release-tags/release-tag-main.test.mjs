// main(): the release job's run, with `gh` faked: reads the tags, skips a re-run, else creates the
// release and writes the summary line (the AAB path of mobile.yml included).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { main } from './release-tag.mjs';

const sha = (c) => c.repeat(40);
const NOON = new Date('2026-11-21T12:00:00Z');
const base = {
  SHA: sha('a'),
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'o/r',
  GITHUB_RUN_ID: '9',
};
const aab = {
  ...base,
  KIND: 'aab',
  PROFILE: 'family-production',
  VERSION: '1.0.0',
  GITHUB_RUN_NUMBER: '88',
};

/** A fake `gh`: answers the tags call with `lines`, records every call. */
function fakeGh(lines) {
  const calls = [];
  const run = (args) => {
    calls.push(args);
    return args[0] === 'api' ? lines.join('\n') : '';
  };
  return { run, calls };
}

test('an AAB: lists the tags over REST, creates the release, writes the step summary', () => {
  const gh = fakeGh([`aab-family-production-v1.0.0-b12 ${sha('b')}`, '']);
  const summary = join(mkdtempSync(join(tmpdir(), 'tag-')), 'summary.md');
  main({ ...aab, GITHUB_STEP_SUMMARY: summary }, { gh: gh.run, now: NOON });
  assert.deepEqual(gh.calls[0].slice(0, 3), ['api', '--paginate', 'repos/{owner}/{repo}/tags?per_page=100']);
  const create = gh.calls[1];
  assert.deepEqual(create.slice(0, 3), ['release', 'create', 'aab-family-production-v1.0.0-b88']);
  assert.ok(create.includes('--notes-start-tag'));
  assert.match(create[create.indexOf('--notes') + 1], /actions\/runs\/9/);
  assert.match(readFileSync(summary, 'utf8'), /^### Release \[aab-family-production-v1\.0\.0-b88\]/);
});

test('a commit that already carries the tag: no release is created', () => {
  const gh = fakeGh([`aab-family-production-v1.0.0-b12 ${sha('a')}`]);
  main(aab, { gh: gh.run, now: NOON });
  assert.equal(gh.calls.length, 1, 'only the tags call');
});

test('no step summary file: the release is still created', () => {
  const gh = fakeGh([]);
  main({ ...base, KIND: 'app' }, { gh: gh.run, now: NOON });
  assert.equal(gh.calls[1][2], 'v2026.11.21-1');
});

test('a malformed env throws before any gh call (the CLI turns it into a warning)', () => {
  const gh = fakeGh([]);
  assert.throws(() => main({ ...aab, SHA: 'x' }, { gh: gh.run, now: NOON }), /SHA/);
  assert.equal(gh.calls.length, 0);
});
