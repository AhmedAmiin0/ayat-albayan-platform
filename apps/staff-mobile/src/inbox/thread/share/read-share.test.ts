import { WA_TEXT_MAX } from '@ab/shared';
import * as Sharing from 'expo-sharing';
import { readShare, sharedMime, toSharedItems } from './read-share';

jest.mock('expo-sharing', () => ({
  getSharedPayloads: jest.fn(),
  getResolvedSharedPayloadsAsync: jest.fn(),
  clearSharedPayloads: jest.fn(),
}));
const raw = jest.mocked(Sharing.getSharedPayloads);
const resolve = jest.mocked(Sharing.getResolvedSharedPayloadsAsync);
const clear = jest.mocked(Sharing.clearSharedPayloads);

const resolved = (name: string, mime: string, size: number | null = 10) => ({
  value: `content://provider/${name}`,
  shareType: 'file' as const,
  contentUri: `file:///data/cache/share-${name}`,
  contentType: 'file' as const,
  contentMimeType: mime,
  originalName: name,
  contentSize: size,
});

beforeEach(() => jest.clearAllMocks());

test('text: never resolved (no fetch of a link), cleared, cut to WA_TEXT_MAX', async () => {
  raw.mockReturnValue([{ value: 'x'.repeat(WA_TEXT_MAX + 50), shareType: 'text' }]);
  const items = await readShare();
  expect(items.text).toHaveLength(WA_TEXT_MAX);
  expect(items.files).toEqual([]);
  expect(resolve).not.toHaveBeenCalled();
  expect(clear).toHaveBeenCalledTimes(1);
});

test('a link stays text and is not resolved', async () => {
  raw.mockReturnValue([{ value: 'https://example.test/page', shareType: 'url' }]);
  expect(await readShare()).toEqual({ text: 'https://example.test/page', files: [] });
  expect(resolve).not.toHaveBeenCalled();
});

test('files: resolved, then cleared; each file gets its own id once', async () => {
  raw.mockReturnValue([{ value: 'content://provider/a', shareType: 'image' }]);
  resolve.mockResolvedValue([resolved('a.jpg', 'image/jpeg'), resolved('b.pdf', 'application/pdf', null)]);
  const { text, files } = await readShare();
  expect(text).toBe('');
  expect(files.map((f) => [f.name, f.mime, f.size, f.n])).toEqual([
    ['a.jpg', 'image/jpeg', 10, 1],
    ['b.pdf', 'application/pdf', null, 2],
  ]);
  expect(new Set(files.map((f) => f.id)).size).toBe(2);
  expect(clear).toHaveBeenCalledTimes(1);
});

test('a text-typed file (its value a content:// uri) is a file, not text', async () => {
  raw.mockReturnValue([{ value: 'content://provider/notes.txt', shareType: 'text' }]);
  resolve.mockResolvedValue([resolved('notes.txt', 'text/plain')]);
  expect((await readShare()).files[0]?.mime).toBe('text/plain');
});

test('a failed resolve rejects, and the share is still cleared', async () => {
  raw.mockReturnValue([{ value: 'content://provider/a', shareType: 'image' }]);
  resolve.mockRejectedValue(new Error('copy failed'));
  await expect(readShare()).rejects.toThrow('copy failed');
  expect(clear).toHaveBeenCalledTimes(1);
});

test('octet-stream named *.pdf is a PDF; parameters and case are dropped', () => {
  expect(sharedMime('application/octet-stream', 'Scan.PDF')).toBe('application/pdf');
  expect(sharedMime('application/octet-stream', 'scan.bin')).toBe('application/octet-stream');
  expect(sharedMime('Image/JPEG; q=1', 'a')).toBe('image/jpeg');
  expect(sharedMime(null, 'a')).toBe('');
});

test('a payload without a cached copy is skipped', () => {
  expect(toSharedItems([{ ...resolved('a', 'image/png'), contentUri: null }])).toEqual([]);
});
