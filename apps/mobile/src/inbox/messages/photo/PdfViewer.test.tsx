import { pdfMetaLine, PDF_PREVIEW_PAGES } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageFile } from '../components/MessageFile';
import { PHONE } from '../../shared/thread-fixtures';
import { pageUrl, pdfDoc, pdfPage, pdfPath } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// The PDF viewer (owner 2026-10-29): every page in the app, asked as the list nears it.
const pageOf = (n: number, total = 12) => t.inbox.pdf.pageOf.replace('{n}', String(n)).replace('{total}', String(total));
const serve = (pages = 12, broken = 0) =>
  mockApiFetch.mockImplementation(async (path: string) => {
    if (!path.includes('/pdf/')) return null;
    const n = Number(path.split('/').pop());
    // 502 (not retried, unlike a 503 and its backoff): the page says so at once.
    if (n === broken) throw new ApiError(502, { code: 'meta_error' });
    return pdfPage(n, { pages });
  });
const calls = (path: string) => mockApiFetch.mock.calls.filter(([p]) => p === path).length;
/** A family's PDF: one tap asks page 1 and opens the viewer once it answers. */
const open = async () => {
  await renderWithQuery(<MessageFile message={pdfDoc()} phone={PHONE} />);
  await fireEvent.press(screen.getByTestId('pdf-d1'));
  return within(await screen.findByTestId('pdf-viewer'));
};

beforeEach(() => mockApiFetch.mockReset());

test('the name and meta line on top; page 1 comes from the bubble, the next pages only as the list nears them', async () => {
  serve();
  const viewer = await open();
  expect(viewer.getByText('hifz-plan.pdf')).toBeTruthy();
  expect(viewer.getByText(pdfMetaLine(pdfPage(1), t.inbox.pdf))).toBeTruthy();
  expect(screen.getByTestId('pdf-pages').props.data).toHaveLength(12);
  expect(await viewer.findByTestId('pdf-page-image-2')).toBeTruthy();
  expect(calls(pdfPath(1))).toBe(1);
  expect(calls(pdfPath(12))).toBe(0);
  expect(viewer.queryByText(t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)))).toBeNull();
});

test('«صفحة n من 12» follows the page in view, the name keeps its own side, and a line says a tap zooms', async () => {
  serve();
  const viewer = await open();
  expect(viewer.getByText(pageOf(1))).toBeTruthy();
  expect(viewer.getByText(t.inbox.pdf.zoomHint)).toBeTruthy();
  expect(viewer.getByRole('imagebutton', { name: pageOf(1) }).props.accessibilityHint).toBe(t.inbox.pdf.zoomHint);
  const changed = { viewableItems: [{ item: 4, key: '4', index: 3, isViewable: true }], changed: [] };
  await fireEvent(screen.getByTestId('pdf-pages'), 'viewableItemsChanged', changed);
  expect(viewer.getByText(pageOf(4))).toBeTruthy();
  expect(StyleSheet.flatten(viewer.getByText('hifz-plan.pdf').props.style).textAlign).toBe(I18nManager.isRTL ? 'right' : 'left');
});

test('a PDF longer than the preview lists its first 30 pages, then says to download the rest', async () => {
  serve(45);
  const viewer = await open();
  expect(screen.getByTestId('pdf-pages').props.data).toHaveLength(PDF_PREVIEW_PAGES);
  expect(viewer.getByText(t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES)))).toBeTruthy();
  expect(viewer.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'hifz-plan.pdf') })).toBeTruthy();
});

test('a tap on a page opens it full screen to pinch and pan, labelled «صفحة 1 من 12»', async () => {
  serve();
  await open();
  await fireEvent.press(screen.getByRole('imagebutton', { name: pageOf(1) }));
  const photo = within(screen.getByTestId('photo-viewer'));
  const full = photo.getByLabelText(pageOf(1));
  expect(full.props.source).toEqual({ uri: pageUrl(1) });
  await fireEvent(screen.getByTestId('photo-viewer'), 'requestClose');
  expect(screen.queryByTestId('photo-viewer')).toBeNull();
  expect(screen.getByTestId('pdf-viewer')).toBeTruthy();
});

test('a page that fails says so, and a tap asks again', async () => {
  serve(12, 2);
  const viewer = await open();
  const failed = await viewer.findByRole('button', { name: t.inbox.pdf.pageFailed });
  expect(viewer.getByText(t.inbox.pdf.pageFailed)).toBeTruthy();
  serve();
  await fireEvent.press(failed);
  expect(await viewer.findByTestId('pdf-page-image-2')).toBeTruthy();
});

test('«إغلاق» and Android’s back close it', async () => {
  serve();
  await open();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByTestId('pdf-viewer')).toBeNull();
  await fireEvent.press(screen.getByTestId('pdf-d1'));
  await fireEvent(screen.getByTestId('pdf-viewer'), 'requestClose');
  expect(screen.queryByTestId('pdf-viewer')).toBeNull();
});
