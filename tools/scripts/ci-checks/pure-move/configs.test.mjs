import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyConfig, countsNotRaised, knipConfigMoved } from './configs.mjs';

const R = [['apps/api/src/main.ts', 'apps/api/src/boot/main.ts'], ['tools/x.mjs', 'tools/y/x.mjs']];
const verdict = (to, [base, head], status = 'M') => classifyConfig({ status, from: to, to }, (side) => (side === 'base' ? base : head), R).kind;

test('workflows and tsconfigs may only follow moved paths (repo or package-relative)', () => {
  const yml = 'run: node tools/x.mjs\n';
  assert.equal(verdict('.github/workflows/ci.yml', [yml, 'run: node tools/y/x.mjs\n']), 'config');
  assert.equal(verdict('.github/workflows/ci.yml', [yml, 'run: node tools/x.mjs --fast\n']), 'bad');
  assert.equal(verdict('.github/workflows/ci.yml', [yml, 'run: node tools/y/x.mjs\nif: false\n']), 'bad');
  const ts = '{ "include": ["src/main.ts"] }';
  assert.equal(verdict('apps/api/tsconfig.json', [ts, '{ "include": ["src/boot/main.ts"] }']), 'config');
  assert.equal(verdict('apps/api/tsconfig.json', [ts, '{ "include": ["src/main.ts"], "strict": false }']), 'bad');
});

test('jscpd and lint baselines: same keys, counts at or below base', () => {
  const j = '{ "clones": 162, "duplicatedLines": 1860 }';
  assert.equal(verdict('refactor/guards/jscpd.json', [j, '{ "clones": 160, "duplicatedLines": 1860 }']), 'config');
  assert.equal(verdict('refactor/guards/jscpd.json', [j, '{ "clones": 163, "duplicatedLines": 1860 }']), 'bad');
  assert.equal(verdict('refactor/guards/lint.json', ['{ "a": 2 }', '{ "a": 2, "b": 0 }']), 'bad');
  assert.equal(countsNotRaised({ a: { b: 2 } }, { a: { b: 1 } }), true);
  assert.equal(countsNotRaised({ a: 2 }, { a: '1' }), false);
});

test('refactor/: maps added or extended and docs pass; any other file there fails', () => {
  assert.equal(verdict('refactor/moves/m1.json', ['', '{}'], 'A'), 'config');
  assert.equal(verdict('refactor/moves/m1.json', ['{}', ''], 'D'), 'bad');
  assert.equal(verdict('refactor/lanes-v2/G.md', ['a', 'b']), 'config');
  assert.equal(verdict('.claude/skills/x/SKILL.md', ['', 'run anything'], 'A'), 'bad');
  assert.equal(verdict('.github/pull_request_template.md', ['see tools/x.mjs', 'see tools/y/x.mjs']), 'config');
  assert.equal(verdict('.github/pull_request_template.md', ['a', 'b']), 'bad');
  assert.equal(verdict('refactor/guards/new.json', ['', '{}'], 'A'), 'bad');
  assert.equal(verdict('refactor/guards/other.json', ['{}', '{"a":1}']), 'bad');
});

test('root knip.json: workspace-relative paths follow moves inside their workspace only', () => {
  const base = JSON.stringify({ workspaces: { '.': { entry: ['tools/x.mjs'] }, 'apps/api': { entry: ['src/main.ts'] }, 'apps/web': { entry: ['src/main.ts'] } } });
  const head = JSON.stringify({ workspaces: { '.': { entry: ['tools/y/x.mjs'] }, 'apps/api': { entry: ['src/boot/main.ts'] }, 'apps/web': { entry: ['src/main.ts'] } } });
  assert.equal(knipConfigMoved({ base, head }, R), true);
  assert.equal(knipConfigMoved({ base, head: head.replace('"apps/web":{"entry":["src/main.ts"]', '"apps/web":{"entry":["src/boot/main.ts"]') }, R), false);
  assert.equal(knipConfigMoved({ base, head: head.replace('"src/boot/main.ts"]', '"src/boot/main.ts"],"ignore":["x"]') }, R), false);
  assert.equal(verdict('knip.json', [base, head]), 'config');
});
