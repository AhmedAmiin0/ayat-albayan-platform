import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../../../move-module/rewrite.ts';
import { entryPins } from '../indexes/entry-pins.ts';
import { tree } from './fixture.ts';

const layer = {
  workspace: 'packages/shared',
  root: 'packages/shared/src',
  extras: [],
  routes: [],
  alias: false,
};

test('a feature name that a star-exported package also exports is pinned to that package', () => {
  const root = tree({
    'packages/shared/src/index.ts':
      "export * from '@ab/core';\nexport * from './messaging/reminders';\n",
    'packages/core/src/index.ts': 'export const localDate = 1;\nexport const id = 2;\n',
  });
  const ctx = {
    project: newProject(),
    r: { root, aliases: [], renamed: new Map<string, string>() },
    layer,
  };
  assert.deepEqual(entryPins(ctx, ['localDate', 'joinNames']), {
    file: 'packages/shared/src/index.ts',
    text: "export * from '@ab/core';\nexport * from './messaging/reminders';\nexport { localDate } from '@ab/core';\n",
  });
  assert.equal(entryPins(ctx, ['joinNames']), undefined);
  assert.equal(entryPins({ ...ctx, layer: { ...layer, alias: true } }, ['localDate']), undefined);
});
