import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, maryam, SUN_17 } from './fixtures';
import { whenText } from './slots';
import { fakeBookingApi, LEADS_KEY, seededClient, walkToConfirm } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
});

test('lead → teacher → free slot → «احجز»: one trial on POST /booking, then back to the lead', async () => {
  const client = seededClient();
  await renderWithQuery(<BookTrialScreen />, client);
  expect(screen.getByRole('header', { name: t.booking.trialTitle })).toBeTruthy();
  expect(screen.getByText('خطوة 1 من 4 · الطالب')).toBeTruthy();
  expect(screen.getByLabelText(t.guardians.name).props.value).toBe('هدى سالم');
  expect(screen.getByLabelText(t.guardians.phone).props.value).toBe('+966552147730');
  expect(screen.getByRole('radio', { name: 'الرياض', checked: true })).toBeTruthy();

  await walkToConfirm();
  expect(mockApiFetch).toHaveBeenCalledWith('/booking/teachers?program=quran');
  const slotsPath = mockApiFetch.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .find((p) => p.startsWith('/booking/slots'));
  expect(slotsPath).toContain(`teacherId=${maryam.id}`);
  expect(slotsPath).toContain('durationMin=45');
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(screen.getByText(maryam.display_name_ar)).toBeTruthy();
  expect(screen.getByText(whenText(SUN_17, 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.getByText(t.booking.trialFree)).toBeTruthy();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/booking', {
    teacherId: maryam.id,
    byday: [0],
    startTimeLocal: '17:00',
    tz: 'Asia/Riyadh',
    durationMin: 45,
    startsOn: '2026-10-04',
    package: 'trial',
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    startsAt: SUN_17,
    leadId: 'a1',
    newStudent: {
      name: 'يوسف',
      program: 'quran',
      tz: 'Asia/Riyadh',
      status: 'trial',
      teacher_gender_pref: null,
    },
    // «عرفت عننا منين؟» comes over from the lead (a Facebook ad).
    guardian: {
      name: 'هدى سالم',
      phone_e164: '+966552147730',
      tz: 'Asia/Riyadh',
      country: 'SA',
      source: 'facebook_ad',
    },
  });
  expect(
    screen.getByText(t.booking.firstLesson.replace('{when}', whenText(SUN_17, 'Asia/Riyadh'))),
  ).toBeTruthy();
  expect(screen.getByText(t.booking.confirmationNote)).toBeTruthy();
  // The lead shows trial_booked at once (even if it leaves a filtered list), and the lists refetch.
  expect(client.getQueryData(['leads', 'a1'])).toMatchObject({ status: 'trial_booked' });
  await waitFor(() => expect(client.getQueryState(LEADS_KEY)?.isInvalidated).toBe(true));

  await fireEvent.press(screen.getByRole('button', { name: t.inbox.subscription.backToChat }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('teachers: filtered by program and gender; one without availability shows why and cannot be picked', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  expect(await screen.findByText(t.booking.noAvailabilityWhy)).toBeTruthy();
  expect(screen.getByText(t.booking.notAvailable)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /سارة المعلمة/ })).toBeNull();
  expect(screen.getByRole('button', { name: /مريم المعلمة/ })).toBeTruthy();
  expect(
    screen.getByText(t.booking.teacherLoad.replace('{n}', '3').replace('{max}', '10')),
  ).toBeTruthy();

  await fireEvent.press(screen.getByRole('radio', { name: t.teachers.genderLabel.female }));
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.program.arabic }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenLastCalledWith('/booking/teachers?program=arabic&gender=female'),
  );
});

test('slots: only free ones, by Riyadh day; «رجوع» walks the steps back, then leaves', async () => {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  expect(await screen.findByRole('button', { name: '17:00' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'الأحد 4 أكتوبر' })).toBeTruthy();
  // The form's «الساعه *» and «تاريخ أول حلقة» labels sit over the free slots.
  expect(screen.getByText(`${t.booking.pickTime} *`)).toBeTruthy();
  expect(screen.getByText(t.booking.startsOn)).toBeTruthy();
  expect(screen.queryByRole('button', { name: '19:00' })).toBeNull(); // Monday's slot is busy
  expect(screen.getByText(t.booking.tzNote.replace('{city}', 'الرياض'))).toBeTruthy();

  const back = () => fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  await back();
  expect(await screen.findByText(`خطوة 2 من 4 · ${t.booking.steps.teacher}`)).toBeTruthy();
  await back();
  expect(screen.getByLabelText(t.leads.studentName).props.value).toBe('يوسف');
  expect(mockBack).not.toHaveBeenCalled();
  await back();
  expect(mockBack).toHaveBeenCalledTimes(1);
});
