import { dehydrate, QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { persistOptions } from '@/lib/query-client';
import { pathKey } from '@/lib/query-keys';
import { queryWrapper } from '@/test/query';
import { periodTotals, usePaymentAttachments, useReceiptUrl } from './queries';

test('totals come off the first page, ignoring anything malformed', () => {
  const sar = { currency: 'SAR', net: 100, payments: 120, refunds: 20 };
  expect(periodTotals({ items: [], totals: [sar, { nope: 1 }] })).toEqual([sar]);
  expect(periodTotals({ items: [] })).toEqual([]);
  expect(periodTotals(undefined)).toEqual([]);
  expect(periodTotals({ totals: 'x' })).toEqual([]);
});

test('a signed receipt URL is never persisted to the disk cache', async () => {
  const client = new QueryClient();
  await renderHook(() => useReceiptUrl('p1', false), { wrapper: queryWrapper(client) });
  const key = [...pathKey('/payments'), 'p1', 'receipt'];
  expect(client.getQueryCache().find({ queryKey: key })?.meta).toEqual({ noPersist: true });
  client.setQueryData(key, { url: 'https://signed' });
  expect(dehydrate(client, persistOptions.dehydrateOptions).queries).toEqual([]);
  client.clear();
});

test('attachments are asked only when opened, and their signed URLs never persisted', async () => {
  const client = new QueryClient();
  const path = '/sales/me/payments/p1/attachments';
  await renderHook(() => usePaymentAttachments(path, false), { wrapper: queryWrapper(client) });
  const query = client.getQueryCache().find({ queryKey: pathKey(path) });
  expect(query?.meta).toEqual({ noPersist: true });
  expect(query?.state.fetchStatus).toBe('idle');
  client.setQueryData(pathKey(path), [{ id: 'a', url: 'https://signed' }]);
  expect(dehydrate(client, persistOptions.dehydrateOptions).queries).toEqual([]);
  client.clear();
});
