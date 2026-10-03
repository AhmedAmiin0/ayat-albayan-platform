import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { pickReceipt } from '@/payments/receipt';
import { renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, maryam, SUN_17 } from './fixtures';
import { uploadInvoice } from './invoice-upload';
import { fakeBookingApi, PHOTO, PREVIEW } from './test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
  jest.mocked(pickReceipt).mockResolvedValue(PHOTO);
  jest.mocked(uploadInvoice).mockResolvedValue('req/0b1c.jpg');
});

test('a lead from the chat books a package: size, slot, the required invoice, weekly days, then its subscription', async () => {
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
  await press('button', '17:00');
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

  // «المراجعة»: the type, the package, its length, the invoice and the weekly days (Sunday is in).
  expect(screen.getByText(t.booking.kind.package)).toBeTruthy();
  expect(screen.getByText(t.enums.packageSize['12'])).toBeTruthy();
  expect(screen.getByText(t.booking.mobile.invoiceUploaded)).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'الأحد', checked: true })).toBeTruthy();
  await press('checkbox', 'الأحد'); // the first lesson's day cannot be dropped
  await press('checkbox', 'الثلاثاء');
  expect(screen.getByText(`${t.booking.pickDays} * · ${t.booking.perWeek.two}`)).toBeTruthy();
  expect(screen.queryByText(t.booking.trialFree)).toBeNull();

  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  const body = mockApiSend.mock.calls[0]?.[2];
  expect(body).toMatchObject({
    kind: 'package',
    byday: [0, 2],
    durationMin: 60,
    package: '12',
    leadId: 'a1',
    invoice: { source: 'upload', path: 'req/0b1c.jpg' },
    newStudent: expect.objectContaining({ name: 'يوسف', status: 'active' }),
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
