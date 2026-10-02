import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, SUN_17 } from './fixtures';
import { fakeBookingApi, seededClient, walkToConfirm } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams = { leadId: 'b2' };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const teacherCalls = () =>
  mockApiFetch.mock.calls.filter((c: unknown[]) => String(c[0]).startsWith('/booking/teachers'));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.leadId = 'b2';
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
});

test('an unnamed +20 lead: both names required, Cairo picked from the number, nothing fetched', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  expect(screen.getByLabelText(t.guardians.name).props.value).toBe('');
  expect(screen.getByRole('radio', { name: 'القاهرة', checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(screen.getAllByText(t.common.required)).toHaveLength(2);
  expect(teacherCalls()).toHaveLength(0);
});

test('a bad number shows why (normalizePhone) and blocks «التالي»; a fixed one goes on as E.164', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.changeText(screen.getByLabelText(t.students.name), 'مريم');
  await fireEvent.changeText(screen.getByLabelText(t.guardians.name), 'أبو مريم');
  await fireEvent.changeText(screen.getByLabelText(t.guardians.phone), '0101234');
  expect(screen.getByText(t.common.phoneErrors.missing_country_code)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(teacherCalls()).toHaveLength(0);

  await fireEvent.changeText(screen.getByLabelText(t.guardians.phone), '٠١٠١٢٣٤٥٦٧٨');
  expect(screen.queryByText(t.common.phoneErrors.missing_country_code)).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: 'دبي' }));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(await screen.findByText('مريم المعلمة')).toBeTruthy();
  expect(teacherCalls()).toHaveLength(1);
});

test('the family zone set on step 1 is the rule zone, and the slots show its clock', async () => {
  mockParams.leadId = 'a1';
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.press(screen.getByRole('radio', { name: 'دبي' }));
  await fireEvent.changeText(screen.getByLabelText(t.students.name), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText('مريم المعلمة'));
  expect(await screen.findByText('18:00 بتوقيت دبي')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '17:00، 18:00 بتوقيت دبي' }));
  mockApiSend.mockResolvedValue(booked(SUN_17));
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({
    tz: 'Asia/Dubai',
    startTimeLocal: '18:00',
    guardian: { tz: 'Asia/Dubai' },
    newStudent: { tz: 'Asia/Dubai' },
  });
});

test('a lead that is in no cached list: not found, no booking possible', async () => {
  mockParams.leadId = 'zz';
  await renderWithQuery(<BookTrialScreen />, createTestQueryClient());
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.next })).toBeNull();
});

test('the helper walk reaches the review from the unnamed lead once the parent is named', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.changeText(screen.getByLabelText(t.guardians.name), 'أم يوسف');
  await walkToConfirm();
  expect(screen.getByText('خطوة 4 من 4 · المراجعة')).toBeTruthy();
});
