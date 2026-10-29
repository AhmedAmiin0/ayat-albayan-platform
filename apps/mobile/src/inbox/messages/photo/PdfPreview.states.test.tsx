import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageFile } from '../components/MessageFile';
import { PHONE } from '../../shared/thread-fixtures';
import { pdfDoc, pdfPage, pdfPath, staffPdf } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// The PDF card's states (review 2026-10-30): no render before a tap on a PDF staff did not send, a
// spinner until the image itself loads, the page's own shape, and a retry that keeps the card.
const serve = (first: () => Promise<unknown>) =>
  mockApiFetch.mockImplementation(async (path: string) => (path === pdfPath(1) ? first() : pdfPage(Number(path.split('/').pop()))));
const calls = () => mockApiFetch.mock.calls.filter(([p]) => p === pdfPath(1)).length;
const show = (row: MessageView = staffPdf()) => renderWithQuery(<MessageFile message={row} phone={PHONE} />);
const thumb = () => screen.getByTestId('pdf-thumb-d1');
/** The thumb's image has loaded, at this size. */
const load = (source: { width: number; height: number }) => fireEvent(thumb(), 'load', { nativeEvent: { source } });

beforeEach(() => mockApiFetch.mockReset());

test.each([
  ['a family’s PDF', pdfDoc()],
  ['an echo (sent from the phone, no staff behind it)', pdfDoc({ direction: 'outbound', sender_name: null })],
  ['a forward (it may be a family’s file)', staffPdf({ forwarded: true })],
])('%s asks nothing on render: a large «PDF» and «اضغط لمعاينة الملف»; a tap asks page 1 and opens the viewer', async (_, row) => {
  serve(async () => pdfPage(1));
  await show(row);
  expect(screen.getByText(t.inbox.pdf.tapToPreview)).toBeTruthy();
  expect(screen.getAllByText(t.inbox.pdf.type)).toHaveLength(2);
  expect(screen.getByTestId('pdf-d1').props.accessibilityHint).toBe(t.inbox.pdf.tapToPreview);
  expect(calls()).toBe(0);
  await fireEvent.press(screen.getByTestId('pdf-d1'));
  expect(await screen.findByTestId('pdf-viewer')).toBeTruthy();
  expect(calls()).toBe(1);
});

test('the spinner (and busy) stay until the thumb’s image has loaded, not just its signed URL', async () => {
  serve(async () => pdfPage(1));
  await show();
  await screen.findByTestId('pdf-thumb-d1');
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
  expect(screen.getByTestId('pdf-d1').props.accessibilityState).toMatchObject({ busy: true });
  await load({ width: 1131, height: 1600 });
  expect(screen.queryByLabelText(t.common.loading)).toBeNull();
  expect(screen.getByTestId('pdf-d1').props.accessibilityState).toMatchObject({ busy: false });
});

test('a landscape page fills the card’s width from its top, in its own shape (never cut at the sides)', async () => {
  serve(async () => pdfPage(1));
  await show();
  await screen.findByTestId('pdf-thumb-d1');
  await load({ width: 1600, height: 1131 });
  expect(StyleSheet.flatten(thumb().props.style)).toMatchObject({ position: 'absolute', top: 0, width: 240, height: 170 });
});

test('a 5xx or no network keeps the card with «تعذّر تحميل الصفحة»; a tap asks again', async () => {
  serve(async () => {
    throw new ApiError(502, { code: 'meta_error' });
  });
  await show();
  expect(await screen.findByText(t.inbox.pdf.pageFailed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) })).toBeNull();
  serve(async () => pdfPage(1));
  await fireEvent.press(screen.getByTestId('pdf-d1'));
  expect(await screen.findByTestId('pdf-thumb-d1')).toBeTruthy();
  expect(calls()).toBe(2);
});
