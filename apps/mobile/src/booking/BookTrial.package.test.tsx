import { fireEvent, screen } from '@testing-library/react-native';
import { cachedList, huda } from '@/inbox/fixtures';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, maryam, SUN_17 } from './fixtures';
import { fakeBookingApi, LEADS_KEY } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockReplace = jest.fn();
// The chat's «اشترك»: the lead's id, number and WhatsApp name, and the package mode.
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: () => true,
    replace: (h: unknown) => mockReplace(h),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({
    leadId: 'a1',
    phone: '+966552147730',
    name: 'هدى سالم',
    mode: 'subscribe',
  }),
}));

const press = async (role: 'button' | 'radio' | 'checkbox', name: string) =>
  fireEvent.press(await screen.findByRole(role, { name }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
});

test('a lead from the chat (no inbox list cached) books a package: weekly days, then its subscription', async () => {
  await renderWithQuery(<BookTrialScreen />);
  expect(screen.getByRole('header', { name: t.subscriptions.new })).toBeTruthy();
  expect(screen.getByText('خطوة 1 من 5 · الطالب')).toBeTruthy();
  expect(screen.getByLabelText(t.guardians.name).props.value).toBe('هدى سالم');
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await press('button', t.booking.next);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));

  expect(await screen.findByText(`خطوة 3 من 5 · ${t.booking.steps.package}`)).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.packageSize['8'], checked: true })).toBeTruthy();
  await press('radio', t.enums.packageSize['12']);
  await press('radio', t.enums.duration['60']);
  await press('button', t.booking.next);
  await press('button', '17:00');
  const slotsPath = mockApiFetch.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .find((p) => p.startsWith('/booking/slots'));
  expect(slotsPath).toContain('durationMin=60');

  // «المراجعة»: the package, its length and the weekly days (Sunday's slot is always in).
  expect(screen.getByText(t.enums.packageSize['12'])).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'الأحد', checked: true })).toBeTruthy();
  await press('checkbox', 'الأحد'); // the first lesson's day cannot be dropped
  await press('checkbox', 'الثلاثاء');
  expect(screen.getByText(`${t.booking.pickDays} * · ${t.booking.perWeek.two}`)).toBeTruthy();
  expect(screen.queryByText(t.booking.trialFree)).toBeNull();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/booking',
    expect.objectContaining({
      byday: [0, 2],
      durationMin: 60,
      package: '12',
      leadId: 'a1',
      newStudent: expect.objectContaining({ name: 'يوسف', status: 'active' }),
      guardian: expect.objectContaining({ name: 'هدى سالم', phone_e164: '+966552147730' }),
    }),
  );

  await press('button', t.inbox.subscription.make);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/inbox/subscribe',
    params: {
      studentId: booked(SUN_17).student_ids[0],
      pkg: '12',
      minutes: '60',
      startsOn: '2026-10-04',
    },
  });
});

test('the trial is still offered there; a lead past its trial shows converted after a package', async () => {
  const client = createTestQueryClient();
  client.setQueryData(LEADS_KEY, cachedList([{ ...huda, status: 'trial_done' }]));
  await renderWithQuery(<BookTrialScreen />, client);
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await press('button', t.booking.next);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await press('radio', t.enums.packageSize.trial);
  expect(screen.getByText(t.booking.trialFree)).toBeTruthy();
  // A trial takes the form's «المده» too, 45 by default.
  expect(screen.getByRole('radio', { name: t.enums.duration['45'], checked: true })).toBeTruthy();
  await press('radio', t.enums.packageSize['8']);
  await press('button', t.booking.next);
  await press('button', '17:00');

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press('button', t.booking.submit);
  await screen.findByText(t.booking.booked);
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({
    package: '8',
    durationMin: 45,
    byday: [0],
  });
  expect(client.getQueryData(['leads', 'a1'])).toMatchObject({ status: 'converted' });
});
