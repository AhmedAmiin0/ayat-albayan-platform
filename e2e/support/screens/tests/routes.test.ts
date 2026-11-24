import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillRoute, parseFullPaths } from '../routes.ts';
import type { Seeded } from '../screens.types.ts';

const TREE = `export interface FileRouteTypes {
  fullPaths:
    | '/'
    | '/admin'
    | '/admin/'
    | '/admin/students/$studentId'
    | '/report/$publicId'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/elsewhere'
}`;

const SEEDED: Seeded = {
  studentId: 's1',
  teacherId: 't1',
  lessonId: 'l1',
  reportId: 'r1',
  publicId: 'p1',
  assistantId: 'a1',
  shortCode: 'Code1234',
  meetingId: 'm1',
};

test('parseFullPaths reads the fullPaths union only, without trailing slashes or repeats', () => {
  const paths = parseFullPaths(TREE);
  assert.deepEqual(paths, ['/', '/admin', '/admin/students/$studentId', '/report/$publicId']);
});

test('parseFullPaths fails loudly when the generated tree has no fullPaths', () => {
  assert.throws(() => parseFullPaths('export const x = 1'), /fullPaths/);
});

test('fillRoute keeps a route without params as it is', () => {
  assert.deepEqual(fillRoute('/admin', SEEDED), { url: '/admin', how: 'direct' });
});

test('fillRoute puts the first seeded row in a detail route', () => {
  const filled = fillRoute('/admin/students/$studentId', SEEDED);
  assert.deepEqual(filled, { url: '/admin/students/s1', how: 'first seeded studentId' });
});

test('fillRoute fills every param of a nested detail route', () => {
  const filled = fillRoute('/admin/students/$studentId/reports/$lessonId', SEEDED);
  assert.equal(filled.url, '/admin/students/s1/reports/l1');
});

test('fillRoute maps a route-specific param name to its seeded row', () => {
  assert.equal(fillRoute('/report/$publicId', SEEDED).url, '/report/p1');
  assert.equal(fillRoute('/admin/short-links/$code', SEEDED).url, '/admin/short-links/Code1234');
  assert.equal(fillRoute('/meeting/$id', SEEDED).url, '/meeting/m1');
});

test('fillRoute sends a signed-link route an invalid token: its error state', () => {
  const filled = fillRoute('/pay/$token', SEEDED);
  assert.equal(filled.url, '/pay/demo-invalid-link');
  assert.match(filled.how, /invalid link/);
});
