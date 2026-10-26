import * as core from '@ab/client-core';
import { listKey, pathKey } from './query-keys';

// E1: the key convention lives in @ab/client-core; this path is an alias, so mobile's keys are unchanged.
test('the alias is the client-core convention', () => {
  expect(pathKey).toBe(core.pathKey);
  expect(listKey).toBe(core.listKey);
});

test('mobile keys keep their old values', () => {
  expect(pathKey('/auth/me')).toEqual(['auth', 'me']);
  expect(listKey('/leads', { status: 'new' })).toEqual(['leads', 'list', { status: 'new' }]);
});
