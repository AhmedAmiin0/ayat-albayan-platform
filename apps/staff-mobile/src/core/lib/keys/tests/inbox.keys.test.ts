import { QueryClient } from '@tanstack/react-query';
import { leadKeys, threadKeys } from '@/core/lib/keys';

const PHONE = '+201000000001';

it('keeps the key shapes the inbox screens already cache under', () => {
  expect(threadKeys.all).toEqual(['threads']);
  expect(threadKeys.lists).toEqual(['threads', 'list']);
  expect(threadKeys.navCount).toEqual(['threads', 'nav-count']);
  expect(threadKeys.chat(PHONE)).toEqual(['threads', PHONE]);
  expect(threadKeys.pdfPage(PHONE, 'm1', 2)).toEqual(['thread-pdf', PHONE, 'm1', 2]);
  expect(threadKeys.gifs('cat')).toEqual(['gifs', 'cat']);
  expect(leadKeys.all).toEqual(['leads']);
  expect(leadKeys.lists).toEqual(['leads', 'list']);
  expect(leadKeys.one('l1')).toEqual(['leads', 'l1']);
  expect(leadKeys.byPhone(PHONE)).toEqual(['leads', 'by-phone', PHONE]);
});

const invalidated = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 1));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.map((key) => client.getQueryState(key)?.isInvalidated);
};

it('a send reaches every chat, list and badge, and no pdf page or gif search', async () => {
  const keys = [
    threadKeys.chat(PHONE),
    threadKeys.lists,
    threadKeys.navCount,
    threadKeys.pdfPage(PHONE, 'm1', 1),
    threadKeys.gifs(''),
  ];
  expect(await invalidated(keys, threadKeys.all)).toEqual([true, true, true, false, false]);
});

it('a lead assign refreshes the lists, and not the open lead', async () => {
  const keys = [leadKeys.lists, leadKeys.one('l1'), leadKeys.byPhone(PHONE)];
  expect(await invalidated(keys, leadKeys.lists)).toEqual([true, false, false]);
});

it('a lead write reaches the lead panel of the chat', async () => {
  const keys = [leadKeys.lists, leadKeys.one('l1'), leadKeys.byPhone(PHONE)];
  expect(await invalidated(keys, leadKeys.all)).toEqual([true, true, true]);
});
