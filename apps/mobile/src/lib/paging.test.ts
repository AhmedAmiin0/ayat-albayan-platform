import { flattenPages, nextPageParam, patchCached, type Page } from './paging';
import { listKey, pathKey } from './query-keys';

const page = <T>(items: T[], n: number, total: number): Page<T> => ({
  items,
  total,
  page: n,
  pageSize: 2,
});

test('next page only while rows remain', () => {
  expect(nextPageParam(page([{}, {}], 1, 5))).toBe(2);
  expect(nextPageParam(page([{}, {}], 2, 5))).toBe(3);
  expect(nextPageParam(page([{}], 3, 5))).toBeUndefined();
  expect(nextPageParam(page([], 1, 0))).toBeUndefined();
});

test('flattenPages keeps order and drops a row repeated by an insert mid-scroll', () => {
  const pages = [page([{ id: 'a' }, { id: 'b' }], 1, 4), page([{ id: 'b' }, { id: 'c' }], 2, 4)];
  expect(flattenPages(pages).map((r) => r.id)).toEqual(['a', 'b', 'c']);
});

test('patchCached patches the matching row inside infinite pages only', () => {
  const data = {
    pageParams: [1, 2],
    pages: [page([{ id: 'a', status: 'new' }], 1, 2), page([{ id: 'b', status: 'new' }], 2, 2)],
  };
  const out = patchCached(data, { id: 'b', status: 'contacted' });
  expect(out).toEqual({
    pageParams: [1, 2],
    pages: [
      page([{ id: 'a', status: 'new' }], 1, 2),
      page([{ id: 'b', status: 'contacted' }], 2, 2),
    ],
  });
  expect(data.pages[1]?.items[0]?.status).toBe('new'); // the snapshot stays untouched
});

test('patchCached handles one page, a detail object, and leaves strangers alone', () => {
  const patch = { id: 'a', status: 'lost' };
  expect(patchCached(page([{ id: 'a', status: 'new' }], 1, 1), patch)).toMatchObject({
    items: [{ id: 'a', status: 'lost' }],
  });
  expect(patchCached({ id: 'a', status: 'new', name: 'x' }, patch)).toEqual({
    id: 'a',
    status: 'lost',
    name: 'x',
  });
  expect(patchCached({ id: 'z', status: 'new' }, patch)).toEqual({ id: 'z', status: 'new' });
  expect(patchCached(undefined, patch)).toBeUndefined();
  expect(patchCached({ role: 'admin' }, patch)).toEqual({ role: 'admin' });
});

test('patchCached patches a plain array response (GET /lessons/day) without touching the snapshot', () => {
  const data = [
    { id: 'a', status: 'scheduled' },
    { id: 'b', status: 'scheduled' },
  ];
  expect(patchCached(data, { id: 'b', status: 'confirmed' })).toEqual([
    { id: 'a', status: 'scheduled' },
    { id: 'b', status: 'confirmed' },
  ]);
  expect(data[1]?.status).toBe('scheduled');
});

test('patchCached patches the overview’s lessons (GET /lessons/overview), teachers untouched', () => {
  const data = { from: 'f', to: 't', teachers: [{ id: 'b' }], lessons: [{ id: 'a', status: 'scheduled' }, { id: 'b', status: 'scheduled' }] };
  expect(patchCached(data, { id: 'b', status: 'confirmed' })).toEqual({
    ...data,
    lessons: [{ id: 'a', status: 'scheduled' }, { id: 'b', status: 'confirmed' }],
  });
  expect(data.lessons[1]?.status).toBe('scheduled');
});

test('keys are the path segments, lists add their params', () => {
  expect(pathKey('/students/42')).toEqual(['students', '42']);
  expect(listKey('/leads', { status: 'new' })).toEqual(['leads', 'list', { status: 'new' }]);
  expect(listKey('/teachers/1/time-off')).toEqual(['teachers', '1', 'time-off', 'list', {}]);
});
