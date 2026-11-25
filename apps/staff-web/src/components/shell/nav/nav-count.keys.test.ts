import { pathKey } from '@ab/client-core';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { navCountKey } from './nav-count.keys';

describe('navCountKey', () => {
  it('keeps the count under its feature prefix', () => {
    expect(navCountKey('students', '/students?page=1')).toEqual([
      'students',
      'nav-count',
      '/students?page=1',
    ]);
  });

  it('a feature write that invalidates its root refreshes its count only', async () => {
    const client = new QueryClient();
    const students = navCountKey('students', '/students');
    const leads = navCountKey('leads', '/leads');
    [students, leads].forEach((key) => client.setQueryData(key, 1));
    await client.invalidateQueries({ queryKey: pathKey('/students'), refetchType: 'none' });
    expect(client.getQueryState(students)?.isInvalidated).toBe(true);
    expect(client.getQueryState(leads)?.isInvalidated).toBe(false);
  });
});
