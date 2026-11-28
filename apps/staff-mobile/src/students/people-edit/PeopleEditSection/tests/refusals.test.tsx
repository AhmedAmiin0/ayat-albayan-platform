import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { clientWith, PEOPLE_KEYS, VIEW } from '@/students/people-edit/people-edit.fixtures';
import { PeopleEditSection } from '@/students/people-edit/PeopleEditSection/PeopleEditSection';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const E = t.peopleEdit;

beforeEach(() => mockApi.reset('write'));

test('a student with history: «تحويل إلى ولي أمر» is off and says why', async () => {
  mockApi.reset('read');
  mockApi.onRead(() => ({ ...VIEW, student: { ...VIEW.student, has_records: true } }));
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.convert }));
  expect(await screen.findByText(E.toGuardianRecords)).toBeTruthy();
  expect(screen.getByRole('button', { name: E.toGuardian })).toBeDisabled();
});

test('a student with a login cannot be moved', async () => {
  mockApi.reset('read');
  mockApi.onRead(() => ({ ...VIEW, student: { ...VIEW.student, has_login: true } }));
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.attach }));
  expect(await screen.findByText(E.moveLogin)).toBeTruthy();
});

test('after «تحويل إلى ولي أمر» the screen is told to leave', async () => {
  mockApi.reset('read');
  mockApi.onRead(() => VIEW);
  mockApi.onWrite(() => ({ guardian_id: 'g1' }));
  const onRemoved = jest.fn();
  await renderWithQuery(
    <PeopleEditSection studentId="s1" onRemoved={onRemoved} />,
    clientWith(PEOPLE_KEYS),
  );
  await fireEvent.press(screen.getByRole('button', { name: E.convert }));
  await fireEvent.press(await screen.findByRole('button', { name: E.toGuardian }));
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/people/students/s1/to-guardian',
    body: undefined,
  });
});

test('a refused student number reads in MSA (409 student_login_phone)', async () => {
  mockApi.reset('read');
  mockApi.onRead(() => VIEW);
  mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'student_login_phone' })));
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.editData }));
  await screen.findByDisplayValue('أم سهيلة');
  await fireEvent.changeText(screen.getByLabelText(E.fields.studentPhone), '+966500000007');
  await fireEvent.press(screen.getByRole('button', { name: E.save }));
  await waitFor(() => expect(screen.getByText(E.errors.student_login_phone)).toBeTruthy());
});
