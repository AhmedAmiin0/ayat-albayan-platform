import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { ChannelThread } from '../ChannelThread';
import type { ChannelMediaPort, ChannelPickedFile } from '../../media-port';
import { channelPage } from '../../testing/channel-fixtures';
import { mockCall } from '@ab/testing/mock-call';

// Photos, PDFs and voice notes through the app's port: POST upload-url → PUT → POST message.
const mockApi = mockCall();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const c = t.studentChannel;
const BASE = '/portal/students/s1/channel';
const signed = {
  ...{ bucket: 'channel-media', path: 'minio:channel-media/c1/f.jpg' },
  ...{ token: 't', signed_url: 'https://files.example.org/put' },
};
const file = (over: Partial<ChannelPickedFile> = {}): ChannelPickedFile => ({
  ...{ mime: 'image/jpeg', name: 'photo.jpg', size: 3, bytes: new ArrayBuffer(3) },
  ...over,
});
const put = jest.fn(async () => ({ ok: true, status: 200 }));
const realFetch = globalThis.fetch;
afterAll(() => {
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(() => channelPage());
  mockApi.reset('write');
  mockApi.onWrite(async ({ method: _m, path }) => (path.endsWith('/upload-url') ? signed : {}));
  put.mockClear();
  globalThis.fetch = put as never;
});

const open = (media: ChannelMediaPort) =>
  renderWithQuery(
    <ChannelThread refs={{ audience: 'portal', studentId: 's1' }} media={media} />,
    freshQueryClient(),
  );

test('a photo: the signed upload, then the message that carries it', async () => {
  await open({ pickPhoto: async () => file() });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.attach }));
  await fireEvent.press(screen.getByRole('button', { name: c.media.gallery }));
  const upload = { mime: 'image/jpeg', size: 3, name: 'photo.jpg' };
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: `${BASE}/attachments/upload-url`,
      body: upload,
    }),
  );
  expect(put).toHaveBeenCalledWith(signed.signed_url, expect.objectContaining({ method: 'PUT' }));
  const attachment = { ...upload, path: signed.path };
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: `${BASE}/messages`,
      body: expect.objectContaining({ body: '', attachment }),
    }),
  );
});

test('a type the chat does not take is refused before any upload', async () => {
  await open({ pickPdf: async () => file({ mime: 'text/plain', name: 'a.txt' }) });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.attach }));
  await fireEvent.press(screen.getByRole('button', { name: c.media.document }));
  expect(await screen.findByText(c.media.badType)).toBeTruthy();
  expect(put).not.toHaveBeenCalled();
});

test('a voice note: the microphone records, «أرسل» sends it with its length', async () => {
  const voice = file({ mime: 'audio/mp4', name: 'voice.m4a', durationMs: 7200.4 });
  const recorder = {
    ...{ start: jest.fn(async () => true), stop: jest.fn(async () => voice) },
    cancel: jest.fn(),
  };
  await open({ recorder });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.record }));
  expect(await screen.findByText(c.media.recording)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: `${BASE}/messages`,
      body: expect.objectContaining({ attachment: expect.objectContaining({ duration_ms: 7200 }) }),
    }),
  );
});

test('a recording dropped with ✕ sends nothing', async () => {
  const recorder = { start: jest.fn(async () => true), stop: jest.fn(), cancel: jest.fn() };
  await open({ recorder });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.record }));
  await act(async () => undefined);
  await fireEvent.press(screen.getByRole('button', { name: c.media.cancel }));
  expect(recorder.cancel).toHaveBeenCalled();
  expect(recorder.stop).not.toHaveBeenCalled();
});
