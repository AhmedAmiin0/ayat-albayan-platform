import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pickReceipt } from '@/payments/receipt';
import { renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, maryam, slot, SUN_17, THU_18 } from './fixtures';
import { packageDaysNote } from './package-choice';
import { dayLine } from './picks';
import { uploadInvoice } from './invoice-upload';
import { fakeBookingApi, PHOTO, PREVIEW } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/payments/receipt', () => ({ pickReceipt: jest.fn() }));
jest.mock('./invoice-upload', () => ({ uploadInvoice: jest.fn() }));
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
  const booking = fakeBookingApi();
  booking.api.slots = [slot(SUN_17), slot(THU_18)];
  mockApiFetch.mockImplementation(booking.fetch);
  jest.mocked(pickReceipt).mockResolvedValue(PHOTO);
  jest.mocked(uploadInvoice).mockResolvedValue('req/0b1c.jpg');
});

test('a lead from the chat books a package: size, a time per day, the required invoice, then its subscription', async () => {
  await renderWithQuery(<BookTrialScreen />);
  expect(screen.getByRole('header', { name: t.subscriptions.new })).toBeTruthy();
  expect(screen.getByText('خطوة 1 من 6 · الطالب')).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.booking.kind.package, checked: true })).toBeTruthy();
  expect(screen.getByLabelText(t.guardians.name).props.value).toBe('هدى سالم');
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await press('button', t.booking.next);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));

  expect(await screen.findByText(`خطوة 3 من 6 · ${t.booking.steps.package}`)).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.packageSize['8'], checked: true })).toBeTruthy();
  await press('radio', t.enums.packageSize['12']);
  await press('radio', t.enums.duration['60']);
  await press('button', t.booking.next);
  // A package picks one time per weekday, then «التالي» (disabled until a day is picked).
  expect(await screen.findByText(t.booking.noDayPicked)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.next }).props.accessibilityState).toMatchObject({ disabled: true });
  await press('checkbox', '17:00');
  await press('checkbox', '18:00');
  expect(screen.getByRole('checkbox', { name: '17:00', checked: true })).toBeTruthy();
  expect(screen.getByText(dayLine(THU_18, 'Asia/Riyadh'))).toBeTruthy();
  await press('button', t.booking.next);
  const slotsPath = mockApiFetch.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .find((p) => p.startsWith('/booking/slots'));
  expect(slotsPath).toContain('durationMin=60');

  // «الفاتورة *»: «التالي» does not pass without it; the photo uploads under the wizard's request id.
  expect(screen.getByText(`خطوة 5 من 6 · ${t.booking.invoice.label}`)).toBeTruthy();
  await press('button', t.booking.next);
  expect(await screen.findByText(t.booking.error.invoice_required)).toBeTruthy();
  await press('button', t.booking.mobile.takePhoto);
  expect(await screen.findByLabelText(PREVIEW)).toBeTruthy();
  await press('button', t.booking.next);

  // «المراجعة»: the type, the package, its length, the invoice and each day with its time.
  expect(screen.getByText(t.booking.kind.package)).toBeTruthy();
  expect(screen.getByText(t.enums.packageSize['12'])).toBeTruthy();
  expect(screen.getByText(t.booking.mobile.invoiceUploaded)).toBeTruthy();
  expect(screen.getByText(dayLine(SUN_17, 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.getByText(dayLine(THU_18, 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.getByText(t.booking.perWeek.two)).toBeTruthy();
  // 12 a month = 3 a week: the admin's warning stays (a note, not a block).
  expect(screen.getByText(packageDaysNote('12', 2) ?? '')).toBeTruthy();
  expect(screen.queryByText(t.booking.trialFree)).toBeNull();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  const body = mockApiSend.mock.calls[0]?.[2];
  expect(body).toMatchObject({
    kind: 'package',
    byday: [0, 4],
    startTimeLocal: '17:00',
    dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }],
    durationMin: 60,
    package: '12',
    leadId: 'a1',
    invoice: { source: 'upload', path: 'req/0b1c.jpg' },
    newStudent: expect.objectContaining({ name: 'يوسف', status: 'new' }),
    guardian: expect.objectContaining({ name: 'هدى سالم', phone_e164: '+966552147730' }),
  });
  // The invoice was uploaded under the very id the booking carries (the API checks the path).
  expect(jest.mocked(uploadInvoice).mock.calls[0]?.[0]).toBe(body.clientRequestId);

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

test('«حلقة تجريبية مجانية فقط» is a type here: no package step, no invoice, free', async () => {
  await renderWithQuery(<BookTrialScreen />);
  await press('radio', t.booking.kind.trial);
  expect(screen.getByText('خطوة 1 من 4 · الطالب')).toBeTruthy();
  expect(screen.getByRole('header', { name: t.booking.trialTitle })).toBeTruthy();
  // A trial takes the form's «المدة» on the first step, 45 by default.
  expect(screen.getByRole('radio', { name: t.enums.duration['45'], checked: true })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentName), 'يوسف');
  await press('button', t.booking.next);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await press('button', '17:00');
  expect(screen.getByText(t.booking.trialFree)).toBeTruthy();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press('button', t.booking.submit);
  await screen.findByText(t.booking.booked);
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({ kind: 'trial', package: 'trial', byday: [0] });
  expect(mockApiSend.mock.calls[0]?.[2]).not.toHaveProperty('invoice');
  expect(uploadInvoice).not.toHaveBeenCalled();
});
