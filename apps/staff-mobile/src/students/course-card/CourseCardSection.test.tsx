import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { pauseState } from '@/students/course-pause/fixtures';
import { BASE, serve, SUB } from '@/students/course-actions/fixtures';
import { CourseCardSection } from './CourseCardSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string, init?: RequestInit) => mockApiFetch(mockPath, init),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const c = t.courseCard;
const PKG = {
  ...{ status: 'active', lessonsTotal: 12, used: 9, left: 3, paid: 360, owed: 360 },
  ...{ currency: 'SAR', projectedEndAt: null },
};
const card = (course: object | null) => ({
  subscriptionId: SUB,
  package: PKG,
  course: course && {
    ...{ teacherName: 'فاطمة', days: [{ weekday: 0, startTimeLocal: '18:30' }], tz: 'Asia/Riyadh' },
    ...{ endsOn: '2026-11-24', lastAt: null, lessonsTotal: 12, unbooked: 2 },
    ...course,
  },
  upcoming: [{ id: 'l1', startsAt: '2026-11-17T15:30:00Z', status: 'confirmed' }],
});
const PREVIEW = {
  subscriptionId: SUB,
  starts: ['2026-11-22T15:30:00Z', '2026-11-24T15:30:00Z'],
  tz: 'Asia/Riyadh',
  endsOn: '2026-11-24',
  notified: [],
};

const BOOKED = { subscriptionId: SUB, inserted: 2, endsOn: '2026-11-24', conflicts: 0 };

function answer(course: object | null) {
  const base = serve();
  mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return BOOKED;
    if (path === `${BASE}/course-card`) return card(course);
    if (path === `${BASE}/course-pause`) return pauseState();
    if (path.startsWith(`${BASE}/course-extend`)) return PREVIEW;
    if (path.startsWith('/lessons?')) return [];
    return base(path);
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('the summary, the lessons without a date and the next lessons', async () => {
  answer({});
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  expect(await screen.findByText(c.unbooked.two)).toBeTruthy();
  expect(screen.getByText(c.upcoming)).toBeTruthy();
  expect(screen.getByText(t.courseActions.teacher.action)).toBeTruthy();
});

test('board CourseXActions: «بقيت 3 حلقات», the package\'s status and its line', async () => {
  answer({});
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  expect(await screen.findByText(c.left.few.replace('{n}', '3'))).toBeTruthy();
  expect(screen.getByText(t.enums.subscriptionStatus.active)).toBeTruthy();
  expect(screen.getByText(/9 من 12 حلقة · دُفع 360 من/)).toBeTruthy();
});

test('an upcoming lesson opens its sheet once read; gone meanwhile: says so', async () => {
  answer({});
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  await screen.findByText(c.upcoming);
  await fireEvent.press(screen.getByRole('button', { name: /الثلاثاء/ }));
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/lessons\?from=2026-11-17T15/), undefined);
});

test('«مدّ الجدول» previews the dates, then books them and says so', async () => {
  answer({});
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  await fireEvent.press(await screen.findByRole('button', { name: c.extend.action }));
  expect(await screen.findByText(c.extend.ask)).toBeTruthy();
  expect(screen.getByText(c.notifyNone)).toBeTruthy();
  // The sheet's confirm is named like the row under it: the last one is the sheet's.
  const confirm = screen.getAllByRole('button', { name: c.extend.confirm }).at(-1);
  if (!confirm) throw new Error('no confirm');
  await fireEvent.press(confirm);
  const posted = expect.objectContaining({ method: 'POST', body: JSON.stringify({ subscriptionId: SUB }) });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`${BASE}/course-extend`, posted));
  expect(await screen.findByText(c.extend.done.two, { exact: false })).toBeTruthy();
});

test('no course booked yet: no moves (no dead end), «إلغاء الاشتراك» stays', async () => {
  answer(null);
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  expect(await screen.findByText(c.noCourse)).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.courseActions.stop.action })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.courseActions.teacher.action })).toBeNull();
  expect(screen.queryByRole('button', { name: c.extend.action })).toBeNull();
});

test('a refused card read hides the summary, never the actions', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === `${BASE}/course-card`) throw new ApiError(500);
    if (path === `${BASE}/course-pause`) return pauseState();
    return serve()(path);
  });
  await renderWithQuery(<CourseCardSection studentId="s1" tree="admin" />);
  expect(await screen.findByRole('button', { name: t.courseActions.stop.action })).toBeTruthy();
});
