import type { RegistrationCheckView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { RegistrationCheckScreen } from './RegistrationCheckScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockParams: { phone?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const rc = t.registrationCheck;
const ME = { role: 'sales', permissions: ['students.check_registration'] };
const PHONE = '+966501112223';
// Invented children (no real people).
const found: RegistrationCheckView = {
  found: true,
  more: true,
  matches: [
    { name: 'ريم', code: 'AB-0201', status: 'pending_renewal', teacher_name: 'أ. هدى' },
    { name: 'سلمى', code: 'AB-0202', status: 'trial', teacher_name: null },
  ],
};
const checks = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith('/sales/registration'));

function answer(view: RegistrationCheckView | Error) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return ME;
    if (view instanceof Error) throw view;
    return view;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete mockParams.phone;
});

test('from the chat: the thread number is checked at once → the children, status, teacher or «none», «more»', async () => {
  mockParams.phone = PHONE;
  answer(found);
  await renderWithQuery(<RegistrationCheckScreen />);
  expect(await screen.findByText(rc.found.replace('{n}', '2'))).toBeTruthy();
  expect(checks()).toEqual([`/sales/registration-check?phone=${encodeURIComponent(PHONE)}`]);
  expect(screen.getByText('ريم')).toBeTruthy();
  expect(screen.getByText(t.enums.studentStatus.pending_renewal)).toBeTruthy();
  expect(screen.getByText(`${rc.teacher}: أ. هدى`)).toBeTruthy();
  expect(screen.getByText(`${rc.teacher}: ${rc.noTeacher}`)).toBeTruthy();
  expect(screen.getByText(rc.more)).toBeTruthy();
  expect(screen.getByRole('radio', { name: rc.byPhone, checked: true })).toBeTruthy();
});

test('by name: not found says so for a name', async () => {
  answer({ found: false, matches: [], more: false });
  await renderWithQuery(<RegistrationCheckScreen />);
  await fireEvent.changeText(await screen.findByLabelText(rc.query), '  يوسف ');
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  expect(await screen.findByText(rc.notFoundName)).toBeTruthy();
  expect(checks()).toEqual([`/sales/registration-check?q=${encodeURIComponent('يوسف')}`]);
});

test('too short a name, an empty or a bad phone: said here, nothing sent', async () => {
  answer(found);
  await renderWithQuery(<RegistrationCheckScreen />);
  await fireEvent.changeText(await screen.findByLabelText(rc.query), 'رم');
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  expect(await screen.findByText(rc.error.query_too_short)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: rc.byPhone }));
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  expect(await screen.findByText(rc.error.one_of)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(rc.phone), '12');
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  expect(await screen.findByText(rc.error.invalid_phone)).toBeTruthy();
  expect(checks()).toEqual([]);
});

test('the API refuses: its validation issue or code in her words, else generic', async () => {
  answer(new ApiError(400, { message: 'validation_failed', issues: [{ path: 'q', message: 'query_too_short' }] }));
  await renderWithQuery(<RegistrationCheckScreen />);
  await fireEvent.changeText(await screen.findByLabelText(rc.query), 'AB-0201');
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  expect(await screen.findByText(rc.error.query_too_short)).toBeTruthy();
  answer(new ApiError(429, { code: 'too_many_requests' }));
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  await waitFor(() => expect(screen.getByText(rc.error.too_many_requests)).toBeTruthy());
  answer(new ApiError(500, null));
  await fireEvent.press(screen.getByRole('button', { name: rc.submit }));
  await waitFor(() => expect(screen.getByText(rc.error.generic)).toBeTruthy());
});

test('without students.check_registration: no form', async () => {
  mockApiFetch.mockImplementation(async () => ({ role: 'sales', permissions: ['self.sales'] }));
  await renderWithQuery(<RegistrationCheckScreen />);
  expect(await screen.findByRole('header', { name: rc.title })).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole('button', { name: rc.submit })).toBeNull());
  expect(checks()).toEqual([]);
});
