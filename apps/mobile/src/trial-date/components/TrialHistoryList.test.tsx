import { lessonWhenText } from '@ab/shared';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { maryam } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { historyOf, OLD, THU_1_18, trialRow } from '../testing/fixtures';
import { TrialHistoryList } from './TrialHistoryList';

const at = (iso: string, tz = 'Asia/Riyadh') => lessonWhenText(new Date(iso), tz, 'ar');

test('rows newest first: when, teacher, who picked it, the outcome chip; the count in the header', async () => {
  const history = historyOf([
    trialRow(),
    trialRow({ lesson_id: OLD, starts_at: '2026-09-20T15:00:00.000Z', outcome: 'moved', picked_by: null }),
  ]);
  await render(<TrialHistoryList history={history} />);
  expect(screen.getByRole('header', { name: t.trialDate.historyTitle })).toBeTruthy();
  expect(screen.getByText(t.trialDate.count.two)).toBeTruthy();
  const rows = screen.getAllByTestId(/^trial-row-/);
  expect(rows).toHaveLength(2);
  const first = within(screen.getByTestId(`trial-row-${history.items[0]?.lesson_id ?? ''}`));
  expect(first.getByText(`${at(THU_1_18)} ${t.schedule.riyadhTime}`)).toBeTruthy();
  expect(first.getByText(maryam.display_name_ar)).toBeTruthy();
  expect(first.getByText(t.trialDate.outcome.upcoming)).toBeTruthy();
  const second = within(screen.getByTestId(`trial-row-${OLD}`));
  expect(second.getByText(t.trialDate.outcome.moved)).toBeTruthy();
  expect(second.getByText(new RegExp(`^${t.trialDate.unknownPicker}`))).toBeTruthy();
  expect(screen.queryByText(new RegExp(`^${t.trialDate.familyTime.split('{time}')[0] ?? ''}`))).toBeNull();
});

test.each([
  ['attended', t.trialDate.outcome.attended],
  ['absent', t.trialDate.outcome.absent],
  ['cancelled', t.trialDate.outcome.cancelled],
  ['awaiting', t.trialDate.outcome.awaiting],
] as const)('outcome %s reads «%s»', async (outcome, word) => {
  await render(<TrialHistoryList history={historyOf([trialRow({ outcome })])} />);
  expect(screen.getByText(word)).toBeTruthy();
});

test('a family in another zone: its own clock under each row', async () => {
  await render(<TrialHistoryList history={historyOf([trialRow()], { family_tz: 'Europe/London' })} />);
  expect(screen.getByText(t.trialDate.familyTime.replace('{time}', at(THU_1_18, 'Europe/London')))).toBeTruthy();
});

test('no trial yet: the empty line and «0»', async () => {
  await render(<TrialHistoryList history={historyOf([])} />);
  expect(screen.getByText(t.trialDate.empty)).toBeTruthy();
  expect(screen.queryAllByTestId(/^trial-row-/)).toHaveLength(0);
});

test('loading, then a failed read with a retry', async () => {
  const onRetry = jest.fn();
  const view = await render(<TrialHistoryList history={undefined} />);
  expect(screen.getByText(t.common.loading)).toBeTruthy();
  await view.rerender(<TrialHistoryList history={undefined} onRetry={onRetry} />);
  expect(screen.getByText(t.trialDate.loadError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(onRetry).toHaveBeenCalled();
});

test('compact: five rows, then «عرض الكل (7)» / «عرض أقل»', async () => {
  const items = Array.from({ length: 7 }, (_, i) => trialRow({ lesson_id: `l${i}`, outcome: 'absent' }));
  await render(<TrialHistoryList history={historyOf(items)} />);
  expect(screen.getAllByTestId(/^trial-row-/)).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: t.trialDate.mobile.showAll.replace('{n}', '7') }));
  expect(screen.getAllByTestId(/^trial-row-/)).toHaveLength(7);
  await fireEvent.press(screen.getByRole('button', { name: t.trialDate.mobile.showLess }));
  expect(screen.getAllByTestId(/^trial-row-/)).toHaveLength(5);
});
