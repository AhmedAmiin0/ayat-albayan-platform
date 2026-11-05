import { sendChatFile } from '@/inbox/composer/send-file';
import type { SharedFile } from './read-share';
import { sendSharedFiles } from './send-shared';

jest.mock('@/inbox/composer/send-file', () => ({
  ...jest.requireActual('@/inbox/composer/send-file'),
  sendChatFile: jest.fn(),
}));
const mockRender = jest.fn();
const mockResize = jest.fn();
const mockSave = jest.fn();
// expo-image-manipulator, as the lazy loader hands it over.
jest.mock('./load-manipulator', () => ({
  loadManipulator: async () => ({
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: (src: unknown) => ({
        renderAsync: () => mockRender(src),
        resize: (size: unknown) => ({ renderAsync: () => mockResize(size) }),
      }),
    },
  }),
}));

const send = jest.mocked(sendChatFile);
const PHONE = '+201000000001';
const MAX = 10 * 1024 * 1024;
const item = (n: number, mime: string, name = `f${String(n)}`): SharedFile => ({
  uri: `file:///cache/share-${String(n)}`,
  mime,
  name,
  size: 100,
  id: `req-${String(n)}`,
  n,
});
const bytes = (size: number) => ({
  arrayBuffer: async () => new ArrayBuffer(size),
  blob: async () => ({ size }),
});
const image = (width: number, height: number) => ({ width, height, saveAsync: mockSave });

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async () => bytes(2048));
  mockRender.mockResolvedValue(image(4000, 3000));
  mockResize.mockResolvedValue(image(1600, 1200));
  mockSave.mockResolvedValue({ uri: 'file:///cache/manipulated.jpg', width: 1600, height: 1200 });
  send.mockImplementation(async ({ id }) => ({ id: `row-${id}` }) as never);
});

test('in order, one at a time; photos as JPEG photo-n.jpg; PDFs keep their name', async () => {
  const steps: string[] = [];
  const items = [item(1, 'image/heic'), item(2, 'application/pdf', 'scan.pdf')];
  const onStep = (n: number, m: number) => steps.push(`${n}/${m}`);
  const results = await sendSharedFiles({ phone: PHONE, items, maxBytes: MAX }, onStep);
  expect(steps).toEqual(['1/2', '2/2']);
  expect(results.map((r) => r.ok)).toEqual([true, true]);
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.7 });
  const [first, second] = send.mock.calls.map(([input]) => input);
  expect(first).toMatchObject({ phone: PHONE, id: 'req-1', maxBytes: MAX });
  expect(first?.file).toMatchObject({ mime: 'image/jpeg', filename: 'photo-1.jpg', size: 2048 });
  expect(second?.file).toMatchObject({ mime: 'application/pdf', filename: 'scan.pdf' });
  expect(mockRender).toHaveBeenCalledTimes(1);
});

test('a tall photo is resized by its height; a small one is not resized', async () => {
  mockRender.mockResolvedValueOnce(image(1000, 3000)).mockResolvedValueOnce(image(800, 600));
  const items = [item(1, 'image/png'), item(2, 'image/png')];
  await sendSharedFiles({ phone: PHONE, items, maxBytes: MAX }, jest.fn());
  expect(mockResize).toHaveBeenCalledTimes(1);
  expect(mockResize).toHaveBeenCalledWith({ height: 1600 });
});

test('a failure on file 2 still sends file 3; a retry passes the same ids', async () => {
  const items = [item(1, 'application/pdf'), item(2, 'application/pdf'), item(3, 'application/pdf')];
  send
    .mockReset()
    .mockResolvedValueOnce({ id: 'a' } as never)
    .mockRejectedValueOnce(new Error('409'))
    .mockResolvedValueOnce({ id: 'c' } as never);
  const results = await sendSharedFiles({ phone: PHONE, items, maxBytes: MAX }, jest.fn());
  expect(results.map((r) => r.ok)).toEqual([true, false, true]);
  const failed = results.filter((r) => !r.ok).map((r) => r.item);
  send.mockResolvedValueOnce({ id: 'b' } as never);
  await sendSharedFiles({ phone: PHONE, items: failed, maxBytes: MAX }, jest.fn());
  expect(send.mock.calls.map(([input]) => input.id)).toEqual(['req-1', 'req-2', 'req-3', 'req-2']);
});

test('a read error or an empty copy is file_upload; an undecodable image file_type', async () => {
  global.fetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('ENOENT'))
    .mockResolvedValueOnce(bytes(0));
  mockRender.mockResolvedValueOnce(image(10, 10)).mockResolvedValueOnce(image(10, 10));
  mockRender.mockRejectedValueOnce(new Error('decode'));
  const items = [
    item(1, 'image/jpeg'),
    item(2, 'image/jpeg'),
    item(3, 'image/svg+xml'),
    item(4, 'video/mp4'),
  ];
  const results = await sendSharedFiles({ phone: PHONE, items, maxBytes: MAX }, jest.fn());
  const codes = results.map((r) => (r.ok ? 'ok' : (r.error as { code?: string }).code));
  expect(codes).toEqual(['file_upload', 'file_upload', 'file_type', 'file_type']);
  expect(send).not.toHaveBeenCalled();
});

test('a PDF of unknown size is measured as a Blob, refused over the limit unread', async () => {
  const arrayBuffer = jest.fn();
  const blob = async () => ({ size: MAX + 1 });
  global.fetch = jest.fn(async () => ({ blob, arrayBuffer }));
  const pdf = { ...item(1, 'application/pdf'), size: null };
  const [result] = await sendSharedFiles({ phone: PHONE, items: [pdf], maxBytes: MAX }, jest.fn());
  expect(result?.ok ? 'ok' : (result?.error as { code?: string }).code).toBe('file_too_large');
  expect(arrayBuffer).not.toHaveBeenCalled();
});
