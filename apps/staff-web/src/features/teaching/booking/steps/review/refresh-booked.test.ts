import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshBooked } from './refresh-booked';

const seeded = (roots: string[]) => {
  const client = new QueryClient();
  for (const root of roots) client.setQueryData([root, 'x'], 1);
  return client;
};

const invalidated = (client: QueryClient, root: string) =>
  client.getQueryState([root, 'x'])?.isInvalidated ?? false;

describe('refreshBooked', () => {
  it('a booking refreshes lessons, students and money', async () => {
    const client = seeded(['lessons', 'students', 'money', 'teachers']);
    await refreshBooked(client);
    expect(['lessons', 'students', 'money'].map((r) => invalidated(client, r))).toEqual([
      true,
      true,
      true,
    ]);
    expect(invalidated(client, 'teachers')).toBe(false);
  });
});
