import { describe, expect, it } from 'vitest';
import { threadListKey, threadListQuery } from './thread-list';

describe('threadListQuery', () => {
  it('asks one page of 30 with no filter', () => {
    expect(threadListQuery({ page: 2 })).toEqual({ page: 2, pageSize: 30 });
  });

  it('sends every filter of the URL and the unread order descending', () => {
    const s = {
      page: 1,
      q: 'أم',
      unread: true,
      sort: 'unread',
      f_status: 'new',
      list: 'l1',
    } as const;
    expect(threadListQuery(s)).toEqual({
      page: 1,
      pageSize: 30,
      search: 'أم',
      unread: 'true',
      sort: 'unread',
      dir: 'desc',
      status: 'new',
      list: 'l1',
    });
  });

  it('keeps the name order in its own direction', () => {
    expect(threadListQuery({ page: 1, sort: 'name' })).toEqual({
      page: 1,
      pageSize: 30,
      sort: 'name',
    });
  });
});

describe('threadListKey', () => {
  it('is the query string the list was always cached under', () => {
    const query = threadListQuery({ page: 1, unread: true, sort: 'unread' });
    expect(threadListKey(query)).toBe('page=1&pageSize=30&unread=true&sort=unread&dir=desc');
  });
});
