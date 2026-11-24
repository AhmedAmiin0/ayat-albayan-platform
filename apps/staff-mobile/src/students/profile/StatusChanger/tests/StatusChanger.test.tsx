import { STUDENT_STATUSES } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { StudentScreen } from '@/students/screens/StudentScreen';
import { historyOf } from '@/trial-date/testing/fixtures';
import { profile } from '@/students/shared/test-data';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

// The status pills come first; the file has other radio groups below (docs/30).
const statusPills = () => screen.getAllByRole('radio').slice(0, STUDENT_STATUSES.length);
const selected = () => statusPills().find((r) => r.props.accessibilityState?.checked);
const pill = (name: string) => screen.getByRole('radio', { name });

/** With no package (404), stopped is set at once. */
const serve = async (p: string) => {
  if (p.includes('/trial-dates')) return historyOf([]);
  if (p === '/students/s1') return profile;
  throw new ApiError(404);
};

beforeEach(() => {
  // The trial history reads its own endpoint.
  mockApiFetch.mockReset().mockImplementation(serve);
  mockApiSend.mockReset();
});

test('every student status is offered; the current one is selected', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  expect(statusPills()).toEqual(STUDENT_STATUSES.map((s) => pill(t.enums.studentStatus[s]))); // all 8, in order
  expect(pill(t.enums.studentStatus.pending_renewal)).toBeTruthy(); // the admin may set it by hand
  expect(selected()).toBe(pill(t.enums.studentStatus.active));
});

test('a tap shows the new status at once and PATCHes /students/:id', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.expired));
  expect(await screen.findByRole('radio', { checked: true, name: t.enums.studentStatus.expired })).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { status: 'expired', expected_status: 'active' });
});

test('a refused change rolls back and says so', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(await screen.findByRole('alert')).toHaveTextContent(t.common.error);
  expect(selected()).toBe(pill(t.enums.studentStatus.active));
});

test('409 status_changed: says the status moved and shows the refetched one (R-STU-05)', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'status_changed', message: 'status_changed' }));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/students/s1') return { ...profile, status: 'pending_renewal' };
    return serve(p);
  });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(await screen.findByRole('alert')).toHaveTextContent(t.students.statusChanged);
  expect(await screen.findByRole('radio', { checked: true, name: t.enums.studentStatus.pending_renewal })).toBeTruthy();
});

test('while a change is saving the pills are off and a second tap sends nothing', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.expired));
  await screen.findByRole('radio', { checked: true, name: t.enums.studentStatus.expired });
  expect(pill(t.enums.studentStatus.churned).props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('tapping the current status sends nothing', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.active));
  expect(mockApiSend).not.toHaveBeenCalled();
});
