import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { historyRow, student } from '@/portal/portal.fixtures';
import { HistoryRow } from './HistoryRow';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const H = t.portal.app.history;
const kid = student();
const show = (over: Parameters<typeof historyRow>[0]) =>
  render(<HistoryRow row={historyRow(over)} student={kid} />);

beforeEach(() => jest.clearAllMocks());

test('an attended lesson with an unseen report and a recording: the new mark, then it opens', async () => {
  await show({ report_id: 'r-history', recording_id: 'rec1' });
  expect(screen.getByText(t.portal.newReport)).toBeTruthy();
  expect(screen.getByText(H.recording)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.portal.openReport }));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(t.portal.newReport)).toBeNull();
});

test('attended before the report is sent: «حضر الحلقة», the pending note, nothing to open', async () => {
  await show({ report_id: null });
  expect(screen.getByText(H.attended)).toBeTruthy();
  expect(screen.getByText(H.reportPending)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test.each([
  ['absent with a reason', { outcome: 'absent', absence_reason: 'سفر' }, 'السبب: سفر'],
  ['absent without one', { outcome: 'absent' }, H.noReason],
  ['excused without a reason', { outcome: 'excused' }, t.portal.excused],
  ['excused with a reason', { outcome: 'excused', absence_reason: 'مرض' }, 'السبب: مرض'],
] as const)('%s: its line, and no pending note', async (_, over, line) => {
  await show({ ...over, report_id: null });
  expect(screen.getByText(line)).toBeTruthy();
  expect(screen.queryByText(H.reportPending)).toBeNull();
});
