import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { jana, lesson, yusuf } from '@/today/testing/fixtures';
import { DetailsStudents } from './DetailsStudents';

const mockPushInTab = jest.fn();
jest.mock('@/core/nav/back-within', () => ({
  ...jest.requireActual('@/core/nav/back-within'),
  pushInTab: (h: string) => mockPushInTab(h),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// 16:50 Riyadh: the 16:00 lesson has started.
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T13:50:00Z') }));

const sent = { id: 'r', status: 'submitted' as const, sent_at: '2026-10-01T13:48:00Z' };
const draft = { id: 'd', status: 'draft' as const };
const onLeave = jest.fn();

beforeEach(() => jest.clearAllMocks());

test.each([
  ['no report yet', [yusuf], t.reports.open],
  [
    'a draft for one of two',
    [
      { ...yusuf, report: sent },
      { ...jana, report: draft },
    ],
    t.reports.resume,
  ],
  ['every report sent', [{ ...yusuf, report: sent }], t.reports.view],
])('teacher, %s: the one button reads its reportStage label', async (_case, students, label) => {
  await render(
    <DetailsStudents lesson={lesson({ id: 'l', students })} role="teacher" onLeave={onLeave} />,
  );
  expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
});

test('before the start or on a cancelled lesson: no report button', async () => {
  const ahead = lesson({ id: 'l', starts_at: '2026-10-01T15:00:00.000Z' });
  const { rerender } = await render(
    <DetailsStudents lesson={ahead} role="teacher" onLeave={onLeave} />,
  );
  expect(screen.queryByRole('button', { name: t.reports.open })).toBeNull();
  const off = lesson({ id: 'l', status: 'cancelled_by_teacher' });
  await rerender(<DetailsStudents lesson={off} role="teacher" onLeave={onLeave} />);
  expect(screen.queryByRole('button', { name: t.reports.open })).toBeNull();
});

test('onReport given: the sheet closes, then onReport(lessonId), never the reports tab', async () => {
  const onReport = jest.fn();
  await render(
    <DetailsStudents
      lesson={lesson({ id: 'l' })}
      role="teacher"
      onLeave={onLeave}
      onReport={onReport}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: t.reports.open }));
  expect(onLeave).toHaveBeenCalled();
  expect(onReport).toHaveBeenCalledWith('l');
  expect(mockPushInTab).not.toHaveBeenCalled();
});

test('no onReport: the default reportHref in the current tab, as before', async () => {
  await render(<DetailsStudents lesson={lesson({ id: 'l' })} role="teacher" onLeave={onLeave} />);
  await fireEvent.press(screen.getByRole('button', { name: t.reports.open }));
  expect(mockPushInTab).toHaveBeenCalledWith('/teacher/reports/l');
});
