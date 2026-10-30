import { describe, expect, it } from 'vitest';
import { listKey, pathKey } from '../../index.js';

describe('query keys (one convention, E1)', () => {
  it('pathKey is the path segments', () => {
    expect(pathKey('/students/s1')).toEqual(['students', 's1']);
    expect(pathKey('/auth/me')).toEqual(['auth', 'me']);
    expect(pathKey('')).toEqual([]);
  });

  it('listKey appends list and the params, so a path prefix invalidates every list', () => {
    expect(listKey('/leads', { status: 'new' })).toEqual(['leads', 'list', { status: 'new' }]);
    expect(listKey('/leads')).toEqual(['leads', 'list', {}]);
    expect(listKey('/leads').slice(0, 1)).toEqual(pathKey('/leads'));
  });
});
