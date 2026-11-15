import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { student } from '@/portal/portal.fixtures';
import { ChildBody } from './ChildBody';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const READS: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 1, absent: 0 } },
  history: { rows: [], next_cursor: null },
  package: { package: null, payments: [], payment_instructions: 'حوّلوا إلى الحساب' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockImplementation(
    async (path: string) => READS[path.split('?')[0]?.split('/')[4] ?? ''],
  );
});

test('a guardian: the four tabs; «الباقة» shows the transfer text', async () => {
  await renderWithQuery(<ChildBody student={student()} kind="guardian" />, freshQueryClient());
  expect(screen.getByRole('tab', { name: t.portal.attendedTab })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.portal.packageTab }));
  expect(await screen.findByText('حوّلوا إلى الحساب')).toBeTruthy();
});

test("a child's own login: «حضرتها» / «غبت عنها», never the package (nor its request)", async () => {
  await renderWithQuery(<ChildBody student={student()} kind="student" />, freshQueryClient());
  expect(screen.getByRole('tab', { name: t.portal.app.child.attendedSelf })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: t.portal.packageTab })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.portal.app.child.absentSelf }));
  expect(await screen.findByText(t.portal.absentEmpty)).toBeTruthy();
  expect(mockFetch.mock.calls.some(([p]) => String(p).endsWith('/package'))).toBe(false);
});

test('an adult who is their own contact sees their package', async () => {
  const adult = student({ contact_is_self: true });
  await renderWithQuery(<ChildBody student={adult} kind="student" />, freshQueryClient());
  expect(screen.getByRole('tab', { name: t.portal.packageTab })).toBeTruthy();
});
