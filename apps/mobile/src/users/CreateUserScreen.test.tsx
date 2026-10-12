import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Share } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { CreateUserScreen } from './CreateUserScreen';
import { CANDIDATES, DETAIL, usersGet } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) => mockApiSend(mockMethod, mockPath, mockBody),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

const F = t.users.form;
const V = t.users.validation;
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const submit = async () => fireEvent.press(screen.getByRole('button', { name: t.users.create.submit }));

async function open() {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<CreateUserScreen />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users/role-options'));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue({ user: DETAIL, credential: { kind: 'password', value: 'Gen-7Kp-x1' } });
});

test('required fields and E.164 are checked before any request', async () => {
  await open();
  await type(F.phone, '0551234');
  await submit();
  expect(screen.getByText(V.name)).toBeTruthy();
  expect(screen.getByText(V.email)).toBeTruthy();
  expect(screen.getByText(t.common.phoneErrors.missing_country_code)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('assistant: the exact POST /users body; the generated password is shown once', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await open();
  await type(F.fullName, ' سارة أحمد ');
  await type(F.email, ' Sara@AB.co ');
  await type(F.phone, '+966 55 123 4567');
  await submit();
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/users', {
      email: 'sara@ab.co', full_name: 'سارة أحمد', role: 'assistant', credential: 'generate', phone_e164: '+966551234567',
    }),
  );
  expect(await screen.findByText('Gen-7Kp-x1')).toBeTruthy();
  expect(screen.getByText(t.users.result.once)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileUsers.share }));
  expect(share).toHaveBeenCalledWith({ message: 'Gen-7Kp-x1' });
  await fireEvent.press(screen.getByRole('button', { name: t.users.result.close }));
  expect(router.back).toHaveBeenCalled();
});

test('student: a record must be picked; the body carries linked_id and the typed password', async () => {
  mockApiSend.mockResolvedValue({ user: DETAIL, credential: null });
  await open();
  await type(F.fullName, 'يوسف علي');
  await type(F.email, 'yousef@ab.co');
  await fireEvent.press(screen.getByRole('radio', { name: t.activity.roles.student }));
  await fireEvent.press(screen.getByRole('radio', { name: t.users.credential.set }));
  await type(t.users.credential.password, 'longenough-1');
  await submit();
  expect(screen.getByText(V.linkRequired)).toBeTruthy();
  await fireEvent.press(await screen.findByRole('button', { name: `يوسف علي ${ltr('AB-0007')}` }));
  expect(mockApiFetch).toHaveBeenCalledWith('/users/link-candidates?kind=student&q=');
  await submit();
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/users', {
      email: 'yousef@ab.co', full_name: 'يوسف علي', role: 'student', credential: 'set', password: 'longenough-1',
      linked_id: CANDIDATES[0]?.id,
    }),
  );
  expect(await screen.findByText(t.users.result.setDone)).toBeTruthy();
});

test('new teacher: the Arabic name is required, then new_teacher goes in the body', async () => {
  await open();
  await type(F.fullName, 'هدى');
  await type(F.email, 'huda@ab.co');
  await fireEvent.press(screen.getByRole('radio', { name: t.activity.roles.teacher }));
  await fireEvent.press(screen.getByRole('radio', { name: t.users.link.newTeacher }));
  await fireEvent.press(screen.getByRole('radio', { name: t.users.credential.link }));
  await submit();
  expect(screen.getByText(V.teacherName)).toBeTruthy();
  await type(t.users.newTeacher.nameAr, 'هدى سالم');
  await submit();
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/users', {
      email: 'huda@ab.co', full_name: 'هدى', role: 'teacher', credential: 'link',
      new_teacher: { display_name_ar: 'هدى سالم', gender: 'female' },
    }),
  );
});

test('an API error code maps to its MSA message', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'email_taken' }));
  await open();
  await type(F.fullName, 'سارة');
  await type(F.email, 'sara@ab.co');
  await submit();
  expect(await screen.findByText(t.users.errors.email_taken)).toBeTruthy();
  expect(screen.queryByTestId('issued-credential')).toBeNull();
});
