import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { jana, lesson } from '@/today/testing/fixtures';
import { LessonDetailsSheet } from './LessonDetailsSheet';
import type { DetailsRole } from './details-text';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// 17:00 Riyadh Thursday 1 Oct, a Muscat student; «now» is 17:20, so the report can be written.
const held = lesson({
  id: 'l-held',
  status: 'completed',
  starts_at: '2026-10-01T14:00:00.000Z',
  ends_at: '2026-10-01T15:00:00.000Z',
  rule_byday: [0, 4],
  trial: true,
  meeting_link: 'https://meet.example/abc',
  platform_classroom: false,
  override_reason: 'موافقة ولي الأمر',
  conflicts: [{ kind: 'teacher_busy', startsAt: '2026-10-01T14:00:00.000Z', endsAt: '2026-10-01T15:00:00.000Z' }],
  students: [{ ...jana, unpaid: true, report: { id: 'r1', status: 'submitted' } }],
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-01T14:20:00Z'), advanceTimers: true });
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/students/s2/balance') return balanceOf(subscription({ status: 'active' }));
    throw new ApiError(404);
  });
});
afterEach(() => jest.useRealTimers());

const show = (role: DetailsRole, l = held) => renderWithQuery(<LessonDetailsSheet lesson={l} role={role} onClose={jest.fn()} />);

test('admin: status, tags, every clock, length, series, students with code / unpaid / report, link, reasons, clashes', async () => {
  await show('admin');
  expect(screen.getByRole('header', { name: 'جنى وليد' })).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.completed)).toBeTruthy();
  expect(screen.getByText(t.schedule.trialTag)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.schedule.viewerTime))).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.schedule.studentTime.replace('{time}', '')}`))).toBeTruthy();
  expect(screen.getByText(`${t.schedule.duration}: ${t.enums.duration['60']}`)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.lessons.sheet.series.split(':')[0]}.*${t.enums.weekday['0']}`))).toBeTruthy();
  expect(screen.getByText(ltr('AB-0185'))).toBeTruthy();
  expect(screen.getByText(t.subscriptions.unpaidFlag)).toBeTruthy();
  expect(screen.getByText(t.lessons.sheet.report.submitted)).toBeTruthy();
  expect(screen.getByText('https://meet.example/abc')).toBeTruthy();
  expect(screen.getByText('موافقة ولي الأمر')).toBeTruthy();
  expect(screen.getByText(t.schedule.generatedConflict)).toBeTruthy();
  // The admin's package line, from the student's balance.
  expect(await screen.findByText(new RegExp(t.subscriptions.usedOf.replace('{used}', '2').replace('{total}', '4')))).toBeTruthy();
});

test('admin: a student opens the file, a sent report opens the report; the sheet closes first', async () => {
  const onClose = jest.fn();
  await renderWithQuery(<LessonDetailsSheet lesson={held} role="admin" onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'جنى وليد') }));
  expect(router.push).toHaveBeenCalledWith('/students/s2');
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(router.push).mock.invocationCallOrder[0] ?? 0);
  await fireEvent.press(screen.getByRole('button', { name: `${t.reports.view} — جنى وليد` }));
  expect(router.push).toHaveBeenCalledWith('/students/reports/view/r1');
});

test('teacher: her students’ reports page and one report button; no package read', async () => {
  await show('teacher', { ...held, students: [{ ...jana, report: { id: 'r1', status: 'draft' } }] });
  expect(screen.getByText(t.lessons.sheet.report.draft)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.reports.resume }));
  expect(router.push).toHaveBeenCalledWith('/teacher/reports/l-held');
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'جنى وليد') }));
  expect(router.push).toHaveBeenCalledWith('/teacher/reports/student/s2');
  expect(mockApiFetch).not.toHaveBeenCalledWith('/students/s2/balance');
  // Admin-only today: the unpaid flag, the override reason and the generated clashes.
  for (const word of [t.subscriptions.unpaidFlag, 'موافقة ولي الأمر', t.schedule.generatedConflict]) {
    expect(screen.queryByText(word)).toBeNull();
  }
});

test('sales: read-only, the lesson link (owner 2026-10-26), no report, no package; a name opens the student (owner 2026-10-28)', async () => {
  await show('sales');
  expect(screen.getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  expect(screen.getByText(t.lessons.joinLink)).toBeTruthy();
  expect(screen.getByText('https://meet.example/abc')).toBeTruthy();
  expect(screen.queryByText(t.lessons.sheet.report.submitted)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/students/s2/balance');
  // Outside the sales tree (the admin's «المزيد» › «المبيعات») the admin's student file; studentHref covers the sales tree.
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'جنى وليد') }));
  expect(router.push).toHaveBeenCalledWith('/students/s2');
});

test('a running lesson says «جارية الآن»; the actions slot renders the role’s buttons; «إغلاق» closes', async () => {
  const onClose = jest.fn();
  const running = { ...held, status: 'confirmed' as const };
  const actions = (l: typeof running) => <AppText>{`actions:${l.id}`}</AppText>;
  await renderWithQuery(<LessonDetailsSheet lesson={running} role="admin" onClose={onClose} actions={actions} />);
  expect(screen.getByText(t.lessons.sheet.live)).toBeTruthy();
  expect(screen.getByText('actions:l-held')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onClose).toHaveBeenCalled();
});

test('closed: nothing of the lesson is mounted', async () => {
  await renderWithQuery(<LessonDetailsSheet lesson={null} role="admin" onClose={jest.fn()} />);
  expect(screen.queryByText(t.lessons.details)).toBeNull();
});
