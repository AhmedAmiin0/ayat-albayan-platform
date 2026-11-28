import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { formResponse, reportView } from '@/teacher/report/testing/fixtures';
import { ReportFormScreen } from '@/teacher/report/screens/ReportFormScreen/ReportFormScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ lessonId: 'l-1' }),
}));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };

async function open(report: object = {}) {
  const form = formResponse(report);
  mockApi.onRead(async ({ path: p }) => (p === '/teachers/me' ? me : form));
  await renderWithQuery(<ReportFormScreen />);
  await screen.findByText(t.reports.readOnlyHint);
}

beforeEach(() => jest.clearAllMocks());

test('the form’s order: id, teacher, student, date, lesson no., program, attendance, link, then its sections', async () => {
  await open();
  const tree = JSON.stringify(screen.toJSON());
  const at = (text: string) => {
    const i = tree.indexOf(text);
    expect(i).toBeGreaterThanOrEqual(0);
    return i;
  };
  const order = [
    t.reports.studentId,
    t.reports.teacher,
    t.reports.student,
    t.reports.date,
    t.reports.lessonNo,
    `${t.reports.program} *`,
    `${t.reports.attendance} *`,
    t.reports.link,
    t.reports.done,
    t.reports.detailTitle,
    `${t.reports.rubricTitle} *`,
    t.reports.notesTitle,
  ].map(at);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test('«البرنامج *» offers the form’s three programs, the student’s own preselected', async () => {
  await open();
  for (const p of Object.values(t.enums.program))
    expect(screen.getByRole('radio', { name: p })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.program.quran, checked: true })).toBeTruthy();
});

test('the program picked rides in the autosaved draft', async () => {
  mockApi.onWrite(() => reportView());
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.program.arabic }));
  await waitFor(
    () =>
      expect(mockApi.writes()).toContainEqual({
        method: 'PUT',
        path: '/reports/r-1/draft',
        body: expect.objectContaining({ program: 'arabic' }),
      }),
    { timeout: 3000 },
  );
});

test('a program saved on the report is the one shown', async () => {
  await open({ program: 'islamic_studies' });
  expect(
    screen.getByRole('radio', { name: t.enums.program.islamic_studies, checked: true }),
  ).toBeTruthy();
});
