import { tile } from '@/classroom/room/state/room-test-kit';
import { gridColumns, gridRows, orderTiles } from './room-grid';

const me = tile({ key: 'me:camera', local: true });
const a = tile({ key: 'a:camera' });
const b = tile({ key: 'b:camera' });
const c = tile({ key: 'c:camera' });
const share = tile({ key: 'a:screen', screen: true });

test('shared screens first, oneself last', () => {
  expect(orderTiles([me, a, share]).map((x) => x.key)).toEqual([
    'a:screen',
    'a:camera',
    'me:camera',
  ]);
});

test('one column for one or two people, two above that', () => {
  expect([1, 2, 3, 6].map(gridColumns)).toEqual([1, 1, 2, 2]);
});

test('rows: a screen alone on its row, the cameras paired once there are three', () => {
  expect(gridRows([me, a]).map((r) => r.map((x) => x.key))).toEqual([['a:camera'], ['me:camera']]);
  expect(gridRows([me, a, b, c, share]).map((r) => r.map((x) => x.key))).toEqual([
    ['a:screen'],
    ['a:camera', 'b:camera'],
    ['c:camera', 'me:camera'],
  ]);
  expect(gridRows([])).toEqual([]);
});
