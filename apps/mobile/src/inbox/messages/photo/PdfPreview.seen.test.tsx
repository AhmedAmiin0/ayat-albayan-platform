import { pdfMetaLine, type MessageView } from '@ab/shared';
import { act, screen } from '@testing-library/react-native';
import type { ViewToken } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { SeenRowsContext, seenRows } from '@/inbox/messages/hooks/seen-rows';
import { MessageFile } from '@/inbox/messages/components/MessageFile';
import { PHONE } from '@/inbox/shared/thread-fixtures';
import { pdfDoc, pdfPage, pdfPath } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// Owner 2026-11-01 «for the pdf do it like WhatsApp»: page 1 once the row is on screen (never a
// burst for a long thread), and a name that is never «File / File».
interface Row {
  id: string;
}
const calls = () => mockApiFetch.mock.calls.filter(([p]) => p === pdfPath(1)).length;
const token = (id: string): ViewToken<Row> =>
  ({ item: { id }, key: id, index: 0, isViewable: true });
const days = jest.fn();

/** The thread list's side: its seen rows, fed by the viewability reports a test makes. */
function listed(row: MessageView) {
  const seen = seenRows<Row>(days);
  const report = (ids: string[]) => seen.onViewableItemsChanged({ viewableItems: ids.map(token) });
  const ui = (m: MessageView) => (
    <SeenRowsContext value={seen.rows}>
      <MessageFile message={m} phone={PHONE} />
    </SeenRowsContext>
  );
  return { report, ui, first: ui(row) };
}

beforeEach(() => {
  days.mockReset();
  mockApiFetch.mockReset().mockImplementation(async () => pdfPage(1));
});

test('a family’s PDF asks page 1 once its row is on screen, and once: a scroll away keeps it', async () => {
  const list = listed(pdfDoc());
  const shown = await renderWithQuery(list.first);
  expect(calls()).toBe(0);
  expect(screen.queryByTestId('pdf-thumb-d1')).toBeNull();
  await act(async () => list.report(['other']));
  expect(calls()).toBe(0);
  await act(async () => list.report(['d1']));
  expect(await screen.findByTestId('pdf-thumb-d1')).toBeTruthy();
  await act(async () => list.report([]));
  await shown.rerender(list.ui(pdfDoc({ body: 'x' })));
  expect(screen.getByTestId('pdf-thumb-d1')).toBeTruthy();
  expect(calls()).toBe(1);
  // The floating day still hears every report.
  expect(days).toHaveBeenCalledTimes(3);
});

test.each([
  ['its file name', { media_name: 'خطة الحفظ.pdf', body: 'plan.pdf' }, 'خطة الحفظ.pdf'],
  ['no file name: a caption line that reads as one', { media_name: null, body: 'plan.pdf\nmore' }, 'plan.pdf'],
  ['no file name, no such caption: «ملف PDF»', { media_name: null, body: 'please read' }, t.inbox.pdf.untitled],
])('the name: %s', async (_, fields, name) => {
  let answer: (page: unknown) => void = () => undefined;
  mockApiFetch.mockImplementation(() => new Promise((r) => (answer = r)));
  await renderWithQuery(<MessageFile message={pdfDoc(fields)} phone={PHONE} />);
  expect(screen.getAllByText(name)).toHaveLength(1);
  // The meta line says «PDF» (beside the badge) until page 1 answers, never «ملف»;
  // then «12 صفحة · PDF · 1.2 ميغابايت».
  expect(screen.queryByText(t.inbox.media.document)).toBeNull();
  expect(screen.getAllByText(t.inbox.pdf.type)).toHaveLength(2);
  await act(async () => answer(pdfPage(1)));
  expect(await screen.findByText(pdfMetaLine(pdfPage(1), t.inbox.pdf))).toBeTruthy();
});
