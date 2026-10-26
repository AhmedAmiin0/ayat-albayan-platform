import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { MessageBubble } from '../components/MessageBubble';
import { PHONE } from '../../shared/thread-fixtures';
import { ThreadModeProvider } from '../../thread/hooks/thread-mode';
import { PATH, photo, SIGNED, signed } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const serve = (file: () => Promise<unknown>) =>
  mockApiFetch.mockImplementation((path: string) => (path === PATH ? file() : Promise.resolve(null)));
const fileCalls = () => mockApiFetch.mock.calls.filter(([path]) => path === PATH).length;
const show = (m = photo(), client = createTestQueryClient()) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />, client);
const fail = (status: number, code?: string) => serve(async () => { throw new ApiError(status, code ? { code } : null); });

beforeEach(() => mockApiFetch.mockReset());

test('a photo shows its thumbnail as the bubble renders, in the fixed 220 box, with «تنزيل» under it', async () => {
  serve(async () => signed());
  await show(photo({ body: 'الواجب' }));
  const image = await screen.findByTestId('photo-image-p1');
  expect(image.props.source).toEqual({ uri: SIGNED });
  expect(image.props.resizeMode).toBe('cover');
  const box = StyleSheet.flatten(screen.getByTestId('photo-p1').props.style);
  expect(box).toMatchObject({ width: 220, height: 220, borderWidth: StyleSheet.hairlineWidth });
  expect(screen.getByText(t.inbox.download.action)).toBeTruthy();
  expect(screen.getByText('الواجب')).toBeTruthy();
});

test('a sticker uses the small uncut box, no border', async () => {
  serve(async () => signed());
  await show(photo({ media_mime: 'image/webp' }));
  expect((await screen.findByTestId('photo-image-p1')).props.resizeMode).toBe('contain');
  const box = StyleSheet.flatten(screen.getByTestId('photo-p1').props.style);
  expect(box).toMatchObject({ width: 120, height: 120 });
  expect(box.borderWidth).toBeUndefined();
});

test.each([
  [410, 'media_expired', () => t.inbox.mediaExpired],
  [403, 'media_forbidden', () => `${t.inbox.media.image} · ${t.inbox.mediaNotAllowed}`],
  [409, 'crm_no_media', () => t.inbox.mediaInCrm],
])('%i %s: a note in place of the box', async (status, code, text) => {
  fail(status, code);
  await show();
  expect(await screen.findByText(text())).toBeTruthy();
  expect(screen.queryByTestId('photo-p1')).toBeNull();
});

test('a 410 is not asked again when the bubble mounts again (scrolling back)', async () => {
  fail(410, 'media_expired');
  const client = createTestQueryClient();
  const first = await show(photo(), client);
  await screen.findByText(t.inbox.mediaExpired);
  await first.unmount();
  await show(photo(), client);
  expect(screen.getByText(t.inbox.mediaExpired)).toBeTruthy();
  expect(fileCalls()).toBe(1);
});

test('another failure says so, and a tap asks again', async () => {
  fail(500);
  await show();
  await fireEvent.press(await screen.findByText(t.inbox.photoFailed));
  await waitFor(() => expect(fileCalls()).toBe(2));
});

test('an image that fails to load is re-signed once, then says so', async () => {
  let n = 0;
  serve(async () => signed(`${SIGNED}&n=${++n}`));
  await show();
  await fireEvent(await screen.findByTestId('photo-image-p1'), 'error');
  await waitFor(() => expect(screen.getByTestId('photo-image-p1').props.source).toEqual({ uri: `${SIGNED}&n=2` }));
  await fireEvent(screen.getByTestId('photo-image-p1'), 'error');
  expect(await screen.findByText(t.inbox.photoFailed)).toBeTruthy();
  expect(fileCalls()).toBe(2);
});

test('a teacher: the label only, and no request at all', async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>
      <MessageBubble message={photo()} phone={PHONE} />
    </ThreadModeProvider>,
  );
  expect(screen.getByText(`${t.inbox.media.image} · ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
  expect(screen.queryByTestId('photo-p1')).toBeNull();
  expect(fileCalls()).toBe(0);
});

test('HEIC keeps «عرض صورة» and signs nothing on render', async () => {
  await show(photo({ media_mime: 'image/heic' }));
  expect(screen.getByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.image) })).toBeTruthy();
  expect(screen.queryByTestId('photo-p1')).toBeNull();
  expect(fileCalls()).toBe(0);
});
