import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t, ltr } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { CANDIDATES, DETAIL, usersGet, YOUSEF } from '@/users/shared/fixtures';
import { UserDetailScreen } from '@/users/screens/UserDetailScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) =>
    mockApiSend(mockMethod, mockPath, mockBody),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canDismiss: () => true },
  useLocalSearchParams: () => ({ id: 'u1' }),
}));

const F = t.users.form;
const all = () => true;
const save = () => screen.getByRole('button', { name: t.users.detail.save });
const pickRole = async (role: 'teacher' | 'student') =>
  fireEvent.press(await screen.findByRole('radio', { name: t.activity.roles[role] }));

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(usersGet());
  mockApiSend.mockReset().mockResolvedValue(DETAIL);
});

test('a staff role: no picker and no lock hint', async () => {
  await renderWithQuery(<UserDetailScreen can={all} />);
  expect(await screen.findByLabelText(F.email)).toBeTruthy();
  expect(screen.queryByText(F.roleLocked)).toBeNull();
  expect(screen.queryByText(F.roleRecord)).toBeNull();
});

test('a student role shows the picker; Save stays off until a record is chosen', async () => {
  await renderWithQuery(<UserDetailScreen can={all} />);
  await pickRole('student');
  expect(screen.getByText(F.roleRecord)).toBeTruthy();
  expect(save().props.accessibilityState.disabled).toBe(true);
  const record = await screen.findByRole('button', { name: `يوسف علي ${ltr('AB-0007')}` });
  await fireEvent.press(record);
  expect(save().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(save());
  const body = { role: 'student', role_id: null, linked_id: CANDIDATES[0]?.id };
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/users/u1', body));
});

test('a teacher role offers a new teacher, named before Save', async () => {
  await renderWithQuery(<UserDetailScreen can={all} />);
  await pickRole('teacher');
  await fireEvent.press(screen.getByRole('radio', { name: t.users.link.newTeacher }));
  expect(save().props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(t.users.newTeacher.nameAr), 'أبرار');
  await fireEvent.press(save());
  const teacher = { display_name_ar: 'أبرار', gender: 'female' };
  const body = { role: 'teacher', role_id: null, new_teacher: teacher };
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/users/u1', body));
});

test('a linked login keeps its role: the hint shows and the picker never does', async () => {
  const detail = { ...DETAIL, ...YOUSEF, id: 'u1' };
  mockApiFetch.mockImplementation(usersGet({ detail }));
  await renderWithQuery(<UserDetailScreen can={all} />);
  expect(await screen.findByText(F.roleLocked)).toBeTruthy();
  expect(screen.queryByText(F.roleRecord)).toBeNull();
});
