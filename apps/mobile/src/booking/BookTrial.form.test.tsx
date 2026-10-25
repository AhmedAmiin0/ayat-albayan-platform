import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { cachedList, huda } from '@/inbox/shared/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, maryam, SUN_17 } from './fixtures';
import { fakeBookingApi, LEADS_KEY } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
});

/** The inbox row as GET /leads returns it, with what «بيانات الطالب» already holds. */
function seeded(qualification: Record<string, unknown> = {}) {
  const client = createTestQueryClient();
  const row = { ...huda, qualification };
  client.setQueryData(LEADS_KEY, cachedList([row]));
  return client;
}

const radio = (group: string, name: string) =>
  within(screen.getByLabelText(group)).getByRole('radio', { name });

test('step 1 asks the registration form’s questions in its words, prefilled from the lead', async () => {
  await renderWithQuery(
    <BookTrialScreen />,
    seeded({ student_name: 'سهيلة', age: 9, gender: 'female' }),
  );
  expect(screen.getByLabelText(t.leads.studentName).props.value).toBe('سهيلة');
  expect(screen.getByLabelText(t.leads.studentAge).props.value).toBe('9');
  expect(radio(t.students.gender, t.enums.gender.female)).toBeChecked();
  expect(screen.getByLabelText(t.guardians.phone)).toBeTruthy();
  expect(screen.getByText(t.guardians.phoneHint)).toBeTruthy();
  // «المدة» with its help, 45 by default; «كيف عرفت عنا؟» from the lead's source.
  expect(radio(t.booking.pickDuration, t.enums.duration['45'])).toBeChecked();
  expect(screen.getByText(t.booking.durationHint)).toBeTruthy();
  expect(radio(t.guardians.source, t.enums.leadSource.facebook_ad)).toBeChecked();
});

test('an impossible age is said in the form’s words and blocks «التالي»', async () => {
  await renderWithQuery(<BookTrialScreen />, seeded({ student_name: 'سهيلة' }));
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentAge), '1');
  expect(screen.getByText(t.students.ageInvalid)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('the answers reach POST /booking: age, gender, length (the slots fit it) and source', async () => {
  await renderWithQuery(<BookTrialScreen />, seeded());
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentAge), '8');
  await fireEvent.press(radio(t.students.gender, t.enums.gender.male));
  await fireEvent.press(radio(t.booking.pickDuration, t.enums.duration['30']));
  await fireEvent.press(radio(t.guardians.source, t.enums.leadSource.referral));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await fireEvent.press(await screen.findByRole('button', { name: /^17:00/ }));
  const slots = mockApiFetch.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .find((p) => p.startsWith('/booking/slots'));
  expect(slots).toContain('durationMin=30');
  expect(screen.getByText(t.enums.duration['30'])).toBeTruthy();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.submit }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(1));
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({
    durationMin: 30,
    newStudent: { name: 'يوسف', age: 8, gender: 'male', status: 'trial' },
    guardian: { source: 'referral' },
  });
});
