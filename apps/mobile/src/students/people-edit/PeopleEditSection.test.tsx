import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientWith, PEOPLE_KEYS, VIEW } from './people-edit.fixtures';
import { PeopleEditSection } from './PeopleEditSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const E = t.peopleEdit;
const firstOf = <T,>(list: T[]): T => {
  const [first] = list;
  if (first === undefined) throw new Error('none');
  return first;
};

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(VIEW);
  mockApiSend.mockReset().mockResolvedValue({ id: 'x' });
});

test('the three actions for a role holding the three keys', async () => {
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  for (const name of [E.editData, E.attach, E.convert])
    expect(screen.getByRole('button', { name })).toBeTruthy();
});

test('only «تعديل البيانات» with people.edit alone', async () => {
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(['people.edit']));
  expect(screen.getByRole('button', { name: E.editData })).toBeTruthy();
  expect(screen.queryByRole('button', { name: E.attach })).toBeNull();
});

test('nothing without people.edit, and no request', async () => {
  await renderWithQuery(
    <PeopleEditSection studentId="s1" />,
    clientWith(['students.attach_guardian', 'people.switch_role']),
  );
  expect(screen.queryByRole('button', { name: E.attach })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('«تعديل البيانات» sends only the changed fields of each part, then the notice', async () => {
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.editData }));
  await screen.findByDisplayValue('أم سهيلة');
  await fireEvent.changeText(firstOf(screen.getAllByLabelText(E.fields.name)), 'سهيلة أحمد');
  await fireEvent.changeText(screen.getByLabelText(E.fields.country), 'SA');
  await fireEvent.press(screen.getByRole('button', { name: E.save }));
  expect(await screen.findByText(E.saved)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/people/students/s1');
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/people/students/s1', { name: 'سهيلة أحمد' });
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/people/guardians/g1', { country: 'SA' });
});

test('a bad phone sends nothing; a taken phone reads in MSA', async () => {
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.editData }));
  await screen.findByDisplayValue('أم سهيلة');
  await fireEvent.changeText(screen.getByLabelText(E.fields.phone), 'abc');
  await fireEvent.press(screen.getByRole('button', { name: E.save }));
  expect(screen.getAllByText(E.invalid).length).toBeGreaterThan(0);
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'phone_taken' }));
  await fireEvent.changeText(screen.getByLabelText(E.fields.phone), '+201000000005');
  await fireEvent.press(screen.getByRole('button', { name: E.save }));
  await waitFor(() => expect(screen.getByText(E.errors.phone_taken)).toBeTruthy());
});
