import assert from 'node:assert/strict';
import { test } from 'node:test';
import { violations } from '../gate.mjs';
import { KIND_RULE, NO_ROOT_PROGRAM, PACKAGE_RULE } from '../packages.mjs';

const check = (config, path) => violations(path, JSON.stringify(config));
const KIND = {
  extends: './tsconfig.base.json',
  compilerOptions: { types: [] },
  include: ['${configDir}/src'],
};

test('a package tsconfig.json that only extends a root kind config passes', () => {
  ['node', 'web', 'native'].forEach((name) => {
    const one = { extends: `../../tsconfig.${name}.json` };
    assert.deepEqual(check(one, 'packages/core/tsconfig.json'), []);
  });
});

test('a package tsconfig.json with anything more or another base fails', () => {
  const more = { extends: '../../tsconfig.node.json', include: ['src'] };
  assert.deepEqual(check(more, 'packages/core/tsconfig.json'), [PACKAGE_RULE]);
  const options = { extends: '../../tsconfig.web.json', compilerOptions: { strict: true } };
  assert.deepEqual(check(options, 'packages/web-kit/tsconfig.json'), [PACKAGE_RULE]);
  const base = { extends: '../../tsconfig.base.json' };
  assert.deepEqual(check(base, 'packages/core/tsconfig.json'), [PACKAGE_RULE]);
  const unknown = { extends: '../../tsconfig.deno.json' };
  assert.equal(check(unknown, 'packages/core/tsconfig.json').includes(PACKAGE_RULE), true);
});

test('every other tsconfig file in a package fails, tsconfig.build.json included', () => {
  const build = { extends: './tsconfig.json' };
  assert.deepEqual(check(build, 'packages/core/tsconfig.build.json'), [PACKAGE_RULE]);
  const nested = { extends: '../../../tsconfig.node.json' };
  assert.equal(check(nested, 'packages/core/src/tsconfig.json').includes(PACKAGE_RULE), true);
});

test('a root kind config extends only the base and includes only its package src', () => {
  ['node', 'web', 'native'].forEach((name) => {
    assert.deepEqual(check(KIND, `tsconfig.${name}.json`), []);
  });
  const wider = { ...KIND, include: ['${configDir}/src', '${configDir}/*.ts'] };
  assert.deepEqual(check(wider, 'tsconfig.node.json'), [KIND_RULE]);
  const chained = { ...KIND, extends: './tsconfig.node.json' };
  assert.equal(check(chained, 'tsconfig.web.json').includes(KIND_RULE), true);
});

test('there is no root tsconfig.json', () => {
  const root = { extends: './tsconfig.base.json', include: ['src'] };
  assert.deepEqual(check(root, 'tsconfig.json'), [NO_ROOT_PROGRAM]);
});

test('an app may extend the base or a root kind config', () => {
  assert.deepEqual(
    check({ extends: '../../tsconfig.web.json' }, 'apps/staff-web/tsconfig.json'),
    [],
  );
  assert.deepEqual(check({ extends: '../tsconfig.node.json' }, 'e2e/tsconfig.json'), []);
  assert.equal(check({ extends: '../../tsconfig.json' }, 'apps/api/tsconfig.json').length, 1);
});
