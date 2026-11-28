import { dashboardRoutes } from '@ab/money';
import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { queryWrapper } from '@/test/query';
import { useSummary, useWork, weekRange } from './dashboard-queries';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

test('the Riyadh week runs Saturday to Friday', () => {
  // Monday 5 Oct 2026 → Saturday 3 Oct to Friday 9 Oct.
  expect(weekRange(new Date('2026-10-05T09:00:00Z'))).toEqual({
    from: '2026-10-03',
    to: '2026-10-09',
  });
});

test('after midnight in Riyadh the next day counts, and Saturday starts a new week', () => {
  // Friday 9 Oct 22:00Z is already Saturday 10 Oct 01:00 in Riyadh.
  expect(weekRange(new Date('2026-10-09T22:00:00Z'))).toEqual({
    from: '2026-10-10',
    to: '2026-10-16',
  });
});

test('the week summary is cached under its route key and the chosen range', async () => {
  const client = new QueryClient();
  const range = { from: '2026-10-03', to: '2026-10-09' };
  await renderHook(() => useSummary(range), { wrapper: queryWrapper(client) });
  const key = dashboardRoutes.summary.key.of(range);
  expect(key).toEqual(['dashboard', 'summary', range]);
  expect(client.getQueryCache().find({ queryKey: key, exact: true })).toBeDefined();
  client.clear();
});

test('the work lists are cached under their route key', async () => {
  const client = new QueryClient();
  await renderHook(() => useWork(), { wrapper: queryWrapper(client) });
  const key = dashboardRoutes.work.key.all;
  expect(client.getQueryCache().find({ queryKey: key, exact: true })).toBeDefined();
  client.clear();
});
