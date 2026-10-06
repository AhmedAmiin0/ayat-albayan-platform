import { freshRecordingUrl } from './recordings-queries';

import { recording, recordingsPage } from './fixtures';

const rec = (id: string, url: string | null) => recording({ id, url });
const page = (items: ReturnType<typeof rec>[]) => recordingsPage(items);

test('reads the new url off the refetched pages', async () => {
  const refetch = jest.fn().mockResolvedValue({ data: { pages: [page([rec('a', 'https://x/new-a')]), page([rec('b', 'https://x/new-b')])] } });
  expect(await freshRecordingUrl(refetch, 'b')).toBe('https://x/new-b');
  expect(refetch).toHaveBeenCalledTimes(1);
});

test('null when the row has no file, is gone, or the refetch gave nothing', async () => {
  expect(await freshRecordingUrl(async () => ({ data: { pages: [page([rec('a', null)])] } }), 'a')).toBeNull();
  expect(await freshRecordingUrl(async () => ({ data: { pages: [page([])] } }), 'a')).toBeNull();
  expect(await freshRecordingUrl(async () => ({}), 'a')).toBeNull();
});
