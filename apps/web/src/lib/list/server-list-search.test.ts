import { describe, expect, it, vi } from 'vitest';
import { parseServerListSearch, serverListProps, serverListState } from './server-list-search';

const KEYS = { sort: ['name', 'date'], filters: ['name', 'kind'] } as const;

describe('parseServerListSearch', () => {
  it('keeps page > 1, an allowlisted sort and the f_<key> filters', () => {
    expect(parseServerListSearch({ page: '3', sort: 'date', dir: 'desc', f_kind: 'trial', f_other: 'x' }, KEYS)).toEqual({
      page: 3,
      sort: 'date',
      dir: 'desc',
      f_kind: 'trial',
    });
  });

  it('defaults stay out of the URL', () => {
    expect(parseServerListSearch({ page: 1, sort: 'secret', f_name: '  ' }, KEYS)).toEqual({});
  });
});

describe('serverListState', () => {
  it('page 1 by default; sort and filters under their plain keys', () => {
    expect(serverListState({ sort: 'name', f_name: 'هبة' }, KEYS)).toEqual({ page: 1, sort: { sort: 'name' }, filters: { name: 'هبة' } });
  });
});

describe('serverListProps', () => {
  const state = { page: 4, sort: { sort: 'name' }, filters: { kind: 'trial' } };

  it('a sort or filter change goes back to page 1', () => {
    const onSearch = vi.fn();
    const props = serverListProps(state, onSearch);
    props.sort.onChange({ key: 'date', dir: 'desc' });
    expect(onSearch).toHaveBeenLastCalledWith({ sort: 'date', dir: 'desc', page: undefined });
    props.sort.onChange({});
    expect(onSearch).toHaveBeenLastCalledWith({ sort: undefined, dir: undefined, page: undefined });
    props.filters.onChange('kind', '');
    expect(onSearch).toHaveBeenLastCalledWith({ f_kind: undefined, page: undefined });
    props.filters.onClear?.(['kind', 'name']);
    expect(onSearch).toHaveBeenLastCalledWith({ f_kind: undefined, f_name: undefined, page: undefined });
  });

  it('reads the URL state back and pages without touching the rest', () => {
    const onSearch = vi.fn();
    const props = serverListProps(state, onSearch);
    expect(props.sort.key).toBe('name');
    expect(props.filters.values).toEqual({ kind: 'trial' });
    props.onPage(2);
    expect(onSearch).toHaveBeenLastCalledWith({ page: 2 });
    props.onPage(1);
    expect(onSearch).toHaveBeenLastCalledWith({ page: undefined });
  });
});
