import type { PeopleEditView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientWith, PEOPLE_KEYS, VIEW } from '@/students/people-edit/people-edit.fixtures';
import { PeopleEditSection } from '@/students/people-edit/PeopleEditSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const E = t.peopleEdit;

async function open(view: PeopleEditView = VIEW) {
  mockApiFetch.mockReset().mockResolvedValue(view);
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.convert }));
  await screen.findByText(E.toStudentHint);
}

beforeEach(() => mockApiSend.mockReset());

test('«الطالب هو ولي الأمر» sets contact_is_self', async () => {
  mockApiSend.mockResolvedValue({ id: 's1', contact_is_self: true });
  await open();
  await fireEvent(screen.getByLabelText(E.selfToggle), 'valueChange', true);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/people/students/s1/contact-self', {
      contact_is_self: true,
    }),
  );
});

test('guardian → student after the confirm, the new code in the notice', async () => {
  mockApiSend.mockResolvedValue({ id: 's9', code: 'AB-0300' });
  await open();
  await fireEvent.press(screen.getByRole('button', { name: E.toStudent }));
  expect(screen.getByText(E.toStudentConfirm.replace('{name}', 'أم سهيلة'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  expect(await screen.findByText(E.toStudentDone.replace('{code}', 'AB-0300'))).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/people/guardians/g1/to-student', undefined);
});

test('student → guardian refused for its history, in MSA', async () => {
  mockApiSend.mockRejectedValue(
    new ApiError(409, { code: 'student_has_records', tables: ['subscriptions'] }),
  );
  await open();
  await fireEvent.press(screen.getByRole('button', { name: E.toGuardian }));
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  expect(await screen.findByText(E.errors.student_has_records)).toBeTruthy();
});

test('a student login turns «تحويل إلى ولي أمر» off and says why', async () => {
  await open({ ...VIEW, student: { ...VIEW.student, has_login: true } });
  expect(screen.getByRole('button', { name: E.toGuardian })).toBeDisabled();
  expect(screen.getByText(E.toGuardianLogin)).toBeTruthy();
});
