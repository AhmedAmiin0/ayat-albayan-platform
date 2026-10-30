import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useAudioPlayer } from 'expo-audio';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { shape } from '@/theme';
import { MessageBubble } from './MessageBubble';
import { message, PHONE } from '../../shared/thread-fixtures';
import { ThreadModeProvider } from '../../thread/hooks/thread-mode';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), setPlaybackRate: jest.fn() };
  const status = { playing: false, currentTime: 0, duration: 12, didJustFinish: false, isLoaded: true, isBuffering: false };
  return {
    useAudioPlayer: jest.fn(() => player),
    useAudioPlayerStatus: jest.fn(() => status),
    setAudioModeAsync: jest.fn(async () => undefined),
  };
});
jest.mock('expo-video', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const player = { play: jest.fn(), pause: jest.fn(), status: 'loading', addListener: jest.fn(() => ({ remove: jest.fn() })) };
  return {
    useVideoPlayer: jest.fn(() => player),
    VideoView: (props: { testID?: string }) => createElement(View, { testID: props.testID }),
  };
});

const PATH = '/threads/%2B966552147730/messages/f1/file';
const SIGNED = 'https://storage.test/wa-media/f1.jpg?token=x';
const kind = t.inbox.media;
const row = (fields: Partial<MessageView>) =>
  message({ id: 'f1', direction: 'inbound', status: 'delivered', body: null, ...fields });
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);
const press = (label: string) => fireEvent.press(screen.getByRole('button', { name: label }));
const openURL = jest.spyOn(Linking, 'openURL');
/** A PDF's page 1: no preview (422), so the bubble keeps today's opener (PdfPreview.test.tsx has the card). */
const PDF_1 = '/threads/%2B966552147730/messages/f1/pdf/1';
const noPreview = () => Promise.reject(new ApiError(422, { code: 'pdf_no_preview' }));
/** W6 answers `file`; the bubble's other reads (/auth/me for its actions) get nothing. */
const serve = (file: () => Promise<unknown>) =>
  mockApiFetch.mockImplementation((path: string) => (path === PATH ? file() : path === PDF_1 ? noPreview() : Promise.resolve(null)));
/** «عرض ملف»: a tap on the PDF card (none of these rows is staff-sent) asks page 1, which has no preview. */
const pdfOpener = async () => {
  await fireEvent.press(screen.getByTestId('pdf-f1'));
  return screen.findByRole('button', { name: t.inbox.viewMedia.replace('{kind}', kind.document) });
};

beforeEach(() => {
  mockApiFetch.mockReset();
  openURL.mockReset().mockResolvedValue(true);
});

test('a HEIC photo keeps «عرض صورة»: nothing is signed on render; the tap asks W6 and opens the signed URL', async () => {
  serve(async () => ({ url: SIGNED, mime: 'image/heic', expires_at: '2026-10-19T10:00:00Z' }));
  await show(row({ media_mime: 'image/heic' }));
  expect(mockApiFetch).not.toHaveBeenCalledWith(PATH);
  await press(t.inbox.viewMedia.replace('{kind}', kind.image));
  expect(mockApiFetch).toHaveBeenCalledWith(PATH);
  await waitFor(() => expect(openURL).toHaveBeenCalledWith(SIGNED));
});

test('the opener is a full touch target (docs/07: 44 pt)', async () => {
  serve(async () => null);
  await show(row({ media_mime: 'application/pdf' }));
  expect((await pdfOpener()).props.style).toMatchObject({ minHeight: shape.control.touch });
});

test('our sent PDF with no preview opens too and shows its name', async () => {
  serve(async () => ({ url: SIGNED, mime: 'application/pdf', expires_at: '2026-10-19T10:00:00Z' }));
  await show(row({ direction: 'outbound', media_mime: 'application/pdf', media_name: 'الجدول.pdf' }));
  await fireEvent.press(await pdfOpener());
  expect(screen.getByText('الجدول.pdf')).toBeTruthy();
  await waitFor(() => expect(openURL).toHaveBeenCalledWith(SIGNED));
});

test('a voice note plays inside the bubble, never in another app', async () => {
  serve(async () => ({ url: SIGNED, mime: 'audio/ogg', expires_at: '2026-10-19T10:00:00Z' }));
  await show(row({ media_mime: 'audio/ogg; codecs=opus' }));
  expect(screen.getByTestId('audio-player')).toBeTruthy();
  await press(t.inbox.playMedia.replace('{kind}', kind.audio));
  await waitFor(() => expect(useAudioPlayer).toHaveBeenCalledWith(SIGNED));
  expect(screen.getByText('0:12')).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('a video is a tile in the bubble and plays full screen, never inline', async () => {
  serve(async () => ({ url: SIGNED, mime: 'video/mp4', expires_at: '2026-10-19T10:00:00Z' }));
  await show(row({ media_mime: 'video/mp4' }));
  expect(screen.getByTestId('video-tile')).toBeTruthy();
  expect(screen.queryByTestId('video-player')).toBeNull();
  await press(t.inbox.playMedia.replace('{kind}', kind.video));
  expect(await screen.findByTestId('video-viewer')).toBeTruthy();
});

test('410: the file expired', async () => {
  serve(async () => { throw new ApiError(410, { code: 'media_expired' }); });
  await show(row({ media_mime: 'audio/ogg' }));
  await press(t.inbox.playMedia.replace('{kind}', kind.audio));
  expect(await screen.findByText(t.inbox.mediaExpired)).toBeTruthy();
});

test('403: the label and «not allowed», no button left', async () => {
  serve(async () => { throw new ApiError(403, { code: 'media_forbidden' }); });
  await show(row({ media_mime: 'application/pdf' }));
  await fireEvent.press(await pdfOpener());
  expect(await screen.findByText(`${kind.document} · ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.viewMedia.replace('{kind}', kind.document) })).toBeNull();
});

test('another failure says so and keeps the button for another try', async () => {
  serve(async () => { throw new ApiError(500); });
  await show(row({ media_mime: 'application/pdf' }));
  await fireEvent.press(await pdfOpener());
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.inbox.viewMedia.replace('{kind}', kind.document) })).toBeTruthy();
});

test('teacher mode: the label only, and no request', async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>
      <MessageBubble message={row({ media_mime: 'audio/ogg' })} phone={PHONE} />
    </ThreadModeProvider>,
  );
  expect(screen.getByText(`${kind.audio} · ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.playMedia.replace('{kind}', kind.audio) })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith(PATH);
});

test('a file type we do not keep (a zip) keeps its plain label line', async () => {
  await show(row({ media_mime: 'application/zip' }));
  expect(screen.getByText(`${kind.document} · ${t.inbox.mediaNotDownloaded}`)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
