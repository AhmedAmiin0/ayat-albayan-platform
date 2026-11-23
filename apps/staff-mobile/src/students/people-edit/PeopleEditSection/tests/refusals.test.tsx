import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { clientWith, PEOPLE_KEYS, VIEW } from '@/students/people-edit/people-edit.fixtures';
import { PeopleEditSection } from '@/students/people-edit/PeopleEditSection/PeopleEditSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const E = t.peopleEdit;

beforeEach(() => mockApiSend.mockReset());

test('a student with history: «تحويل إلى ولي أمر» is off and says why', async () => {
  mockApiFetch
    .mockReset()
    .mockResolvedValue({ ...VIEW, student: { ...VIEW.student, has_records: true } });
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.convert }));
  expect(await screen.findByText(E.toGuardianRecords)).toBeTruthy();
  expect(screen.getByRole('button', { name: E.toGuardian })).toBeDisabled();
});

test('a student with a login cannot be moved', async () => {
  mockApiFetch
    .mockReset()
    .mockResolvedValue({ ...VIEW, student: { ...VIEW.student, has_login: true } });
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.attach }));
  expect(await screen.findByText(E.moveLogin)).toBeTruthy();
});

test('after «تحويل إلى ولي أمر» the screen is told to leave', async () => {
  mockApiFetch.mockReset().mockResolvedValue(VIEW);
  mockApiSend.mockResolvedValue({ guardian_id: 'g1' });
  const onRemoved = jest.fn();
  await renderWithQuery(
    <PeopleEditSection studentId="s1" onRemoved={onRemoved} />,
    clientWith(PEOPLE_KEYS),
  );
  await fireEvent.press(screen.getByRole('button', { name: E.convert }));
  await fireEvent.press(await screen.findByRole('button', { name: E.toGuardian }));
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/people/students/s1/to-guardian', undefined);
});

test('a refused student number reads in MSA (409 student_login_phone)', async () => {
  mockApiFetch.mockReset().mockResolvedValue(VIEW);
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'student_login_phone' }));
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.editData }));
  await screen.findByDisplayValue('أم سهيلة');
  await fireEvent.changeText(screen.getByLabelText(E.fields.studentPhone), '+966500000007');
  await fireEvent.press(screen.getByRole('button', { name: E.save }));
  await waitFor(() => expect(screen.getByText(E.errors.student_login_phone)).toBeTruthy());
});
