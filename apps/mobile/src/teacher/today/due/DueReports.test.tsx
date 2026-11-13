import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { DueReports } from './DueReports';
import { PENDING_REPORTS_HREF, type DueReport } from './due-reports';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: string) => mockPush(h) } }));

const due = (i: number): DueReport => ({
  lessonId: `l${i}`,
  startsAt: `2026-09-2${i}T13:00:00.000Z`,
  names: [`طالب ${i}`],
  stage: i === 2 ? 'resume' : 'write',
});
const five = [1, 2, 3, 4, 5].map(due);

beforeEach(() => jest.clearAllMocks());

test('5 due: the title counts 5, three rows, then «عرض الباقي (2)» to the list', async () => {
  await render(<DueReports rows={five} failed={false} onRetry={jest.fn()} />);
  expect(screen.getByText(t.teacherToday.pendingTitle.replace('{n}', '5'))).toBeTruthy();
  expect(screen.getByRole('button', { name: `${t.reports.resume} — طالب 2` })).toBeTruthy();
  expect(screen.queryByText('طالب 4')).toBeNull();
  await fireEvent.press(screen.getByText(t.teacherToday.pendingMore.replace('{n}', '2')));
  expect(mockPush).toHaveBeenCalledWith(PENDING_REPORTS_HREF);
});

test('a row opens that lesson’s report form in «اليوم»', async () => {
  await render(<DueReports rows={five} failed={false} onRetry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: `${t.reports.open} — طالب 1` }));
  expect(mockPush).toHaveBeenCalledWith('/teacher/today/report/l1');
});

test('nothing due: nothing at all; the read failed with nothing saved: the retry', async () => {
  const { rerender } = await render(<DueReports rows={[]} failed={false} onRetry={jest.fn()} />);
  expect(screen.queryByTestId('due-reports')).toBeNull();
  const onRetry = jest.fn();
  await rerender(<DueReports rows={[]} failed onRetry={onRetry} />);
  expect(screen.getByText(t.teacherToday.pendingError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.teacherStudents.retry }));
  expect(onRetry).toHaveBeenCalled();
});
