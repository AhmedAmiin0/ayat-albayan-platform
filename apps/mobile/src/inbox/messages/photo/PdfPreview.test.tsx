import { pdfMetaLine } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { shape } from '@/theme';
import { MessageFile } from '../components/MessageFile';
import { PHONE } from '../../shared/thread-fixtures';
import { pageUrl, pdfDoc, pdfPage, pdfPath } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// A chat PDF like WhatsApp's (owner 2026-10-29): page 1 as the thumb, the name, «12 صفحة · PDF · 1.2 ميغابايت».
const FILE = '/threads/%2B966552147730/messages/d1/file';
const SIGNED_PDF = 'https://storage.test/wa-media/d1.pdf?token=x';
const serve = (first: () => Promise<unknown>) =>
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === pdfPath(1)) return first();
    if (path === FILE) return { url: SIGNED_PDF, mime: 'application/pdf', expires_at: '' };
    return path.includes('/pdf/') ? pdfPage(Number(path.split('/').pop())) : null;
  });
const fail = (status: number, code: string) => serve(async () => { throw new ApiError(status, { code }); });
const calls = (path: string) => mockApiFetch.mock.calls.filter(([p]) => p === path).length;
const hold = jest.fn();
const show = (client = createTestQueryClient()) =>
  renderWithQuery(<MessageFile message={pdfDoc()} phone={PHONE} onLongPress={hold} />, client);
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  mockApiFetch.mockReset();
  hold.mockReset();
  openURL.mockReset().mockResolvedValue(true);
});

test('page 1 is asked on render: the thumb (decoded small), the name and the meta line, in a fixed 240 card', async () => {
  serve(async () => pdfPage(1));
  await show();
  const thumb = await screen.findByTestId('pdf-thumb-d1');
  expect(thumb.props.source).toEqual({ uri: pageUrl(1) });
  expect(thumb.props.resizeMethod).toBe('resize');
  expect(screen.getByText('hifz-plan.pdf')).toBeTruthy();
  const meta = pdfMetaLine({ pages: 12, bytes: 1.2 * 1024 * 1024 }, t.inbox.pdf);
  expect(screen.getByText(meta)).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('pdf-d1').props.style)).toMatchObject({ width: 240, minHeight: shape.control.touch });
  expect(screen.getByText(t.inbox.download.action)).toBeTruthy();
  expect(calls(FILE)).toBe(0);
});

test('the card is labelled «افتح …» with the meta line for the screen reader', async () => {
  serve(async () => pdfPage(1));
  await show();
  await screen.findByTestId('pdf-thumb-d1');
  const label = `${t.inbox.pdf.open.replace('{name}', 'hifz-plan.pdf')} · ${pdfMetaLine(pdfPage(1), t.inbox.pdf)}`;
  expect(screen.getByRole('button', { name: label })).toBeTruthy();
});

test.each([
  [410, 'media_expired', () => t.inbox.mediaExpired],
  [409, 'crm_no_media', () => t.inbox.mediaInCrm],
  [403, 'media_forbidden', () => `${t.inbox.media.document} · ${t.inbox.mediaNotAllowed}`],
])('%i %s: a note in place of the card', async (status, code, text) => {
  fail(status, code);
  await show();
  expect(await screen.findByText(text())).toBeTruthy();
  expect(screen.queryByTestId('pdf-d1')).toBeNull();
});

test('422 (no preview): today’s opener, which opens the file in the phone’s viewer', async () => {
  fail(422, 'pdf_no_preview');
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) }));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith(SIGNED_PDF));
  expect(screen.queryByTestId('pdf-d1')).toBeNull();
});

test('a final answer is not asked again when the bubble mounts again (scrolling back)', async () => {
  fail(422, 'pdf_no_preview');
  const client = createTestQueryClient();
  const first = await show(client);
  await screen.findByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) });
  await first.unmount();
  await show(client);
  expect(calls(pdfPath(1))).toBe(1);
});

test('a tap opens the viewer; a long press opens the bubble menu instead', async () => {
  serve(async () => pdfPage(1));
  await show();
  await screen.findByTestId('pdf-thumb-d1');
  await fireEvent(screen.getByTestId('pdf-d1'), 'longPress');
  expect(hold).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('pdf-viewer')).toBeNull();
  await fireEvent.press(screen.getByTestId('pdf-d1'));
  expect(screen.getByTestId('pdf-viewer')).toBeTruthy();
});

test('a thumb that fails to load is re-signed once, then the card goes on without it', async () => {
  let n = 0;
  serve(async () => pdfPage(1, { url: `${pageUrl(1)}&n=${++n}` }));
  await show();
  await fireEvent(await screen.findByTestId('pdf-thumb-d1'), 'error');
  await waitFor(() => expect(screen.getByTestId('pdf-thumb-d1').props.source).toEqual({ uri: `${pageUrl(1)}&n=2` }));
  await fireEvent(screen.getByTestId('pdf-thumb-d1'), 'error');
  await waitFor(() => expect(screen.queryByTestId('pdf-thumb-d1')).toBeNull());
  expect(screen.getByText('hifz-plan.pdf')).toBeTruthy();
  expect(calls(pdfPath(1))).toBe(2);
});
