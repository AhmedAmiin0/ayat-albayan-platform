import { freshRecordingUrl } from './recordings-queries';
import { recording, recordingsPage } from './fixtures';

const rec = (id: string, url: string | null) => recording({ id, url });
const page = (n: number, items: ReturnType<typeof rec>[]) => ({ ...recordingsPage(items), page: n });

test('loads only the page that holds the row and reads the new url off it', async () => {
  const load = jest.fn().mockResolvedValue(page(2, [rec('b', 'https://x/new-b')]));
  const held = [page(1, [rec('a', 'https://x/old-a')]), page(2, [rec('b', 'https://x/old-b')])];
  expect(await freshRecordingUrl(load, held, 'b')).toBe('https://x/new-b');
  expect(load).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledWith(2);
});

test('null when the row has no file, moved off its page, or is not loaded', async () => {
  const held = [page(1, [rec('a', 'https://x/old-a')])];
  expect(await freshRecordingUrl(async () => page(1, [rec('a', null)]), held, 'a')).toBeNull();
  expect(await freshRecordingUrl(async () => page(1, []), held, 'a')).toBeNull();
  const load = jest.fn();
  expect(await freshRecordingUrl(load, held, 'zzz')).toBeNull();
  expect(load).not.toHaveBeenCalled();
});

test('a failed load throws, so the play button shows its error instead of the old link', async () => {
  const held = [page(1, [rec('a', 'https://x/old-a')])];
  await expect(freshRecordingUrl(async () => { throw new Error('offline'); }, held, 'a')).rejects.toThrow('offline');
});
