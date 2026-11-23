import { fireEvent, screen } from '@testing-library/react-native';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '#/portal/portal.fixtures.ts';
import { ChildSummaryCard } from './ChildSummaryCard';

const mockFetch = jest.fn();
const onPress = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const C = t.portal.app.children;
const report = {
  id: 'r-1',
  lesson_id: 'l-1',
  lesson_starts_at: '2026-11-12T15:00:00.000Z',
  sent_at: '2026-11-12T16:00:00.000Z',
  teacher: null,
  recording_id: null,
};
const pkg = {
  package: '12',
  duration: 45,
  lessons_total: 12,
  lessons_used: 8,
  remaining: 4,
  starts_on: '2026-11-01',
  renews_on: null,
  status: 'active',
  amount_due: null,
};

/** Each child read by its last path segment (…/students/:id/lessons → lessons). */
function serve(lessons: unknown[]) {
  const reads: Record<string, unknown> = {
    lessons: { lessons, prepare: null, month: { attended: 5, absent: 2 } },
    reports: { reports: [report] },
    package: { package: pkg, payments: [], payment_instructions: '' },
  };
  mockFetch.mockImplementation(async (path: string) => reads[path.split('/')[4] ?? '']);
}

const show = (kind: PortalKind, who: PortalStudent = student()) =>
  renderWithQuery(
    <ChildSummaryCard student={who} kind={kind} onPress={onPress} />,
    freshQueryClient(),
  );
const used = t.portal.app.package.usedOf.replace('{used}', '8').replace('{total}', '12');

beforeEach(() => jest.clearAllMocks());

test('a guardian: the next lesson, the counts, the package, the last report', async () => {
  serve([lesson(new Date(), 90)]);
  await show('guardian');
  expect(await screen.findByText(t.portal.nextLesson)).toBeTruthy();
  expect(screen.getByText(t.portal.app.lesson.teacher.replace('{name}', 'فاطمة'))).toBeTruthy();
  expect(await screen.findByText(used)).toBeTruthy();
  expect(screen.getByText(C.left)).toBeTruthy();
  expect(screen.getByText('5')).toBeTruthy();
  expect(await screen.findByText(t.portal.newReport)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${C.lastReport.replace('{date}', '')}`))).toBeTruthy();
});

test('the whole card is one button', async () => {
  serve([]);
  await show('guardian');
  await fireEvent.press(screen.getByRole('button', { name: /سارة/ }));
  expect(onPress).toHaveBeenCalled();
});

test('no lesson ahead: the calm note once the lessons are known', async () => {
  serve([]);
  await show('guardian');
  expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
  expect(screen.queryByText(t.portal.nextLesson)).toBeNull();
});

test("a child's own login: no lessons left, no bar, never a package request", async () => {
  serve([lesson(new Date(), 90)]);
  await show('student');
  expect(await screen.findByText(t.portal.nextLesson)).toBeTruthy();
  expect(screen.queryByText(C.left)).toBeNull();
  expect(screen.queryByText(used)).toBeNull();
  expect(mockFetch.mock.calls.some(([p]) => String(p).endsWith('/package'))).toBe(false);
});
