import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pickReceipt } from '@/payments/receipt';
import { renderWithQuery } from '@/test/query';
import { booked, maryam, SUN_17 } from './fixtures';
import { uploadInvoice } from './invoice-upload';
import type { MakeupSource } from './makeup-draft';
import { MakeupWizard } from './MakeupWizard';
import { fakeBookingApi, PHOTO } from './test-utils';
import { whenText } from './slots';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/payments/receipt', () => ({ pickReceipt: jest.fn() }));
jest.mock('./invoice-upload', () => ({ uploadInvoice: jest.fn() }));
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: (h: unknown) => mockPush(h) },
}));

const source: MakeupSource = {
  lessonId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  studentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  studentName: 'سهيلة',
  tz: 'Asia/Riyadh',
  missedAt: '2026-09-27T14:00:00.000Z',
  durationMin: 60,
  teacherId: maryam.id,
  teacherName: maryam.display_name_ar,
};
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));

async function walkToConfirm() {
  await press(t.booking.mobile.keepTeacher.replace('{teacher}', maryam.display_name_ar));
  await press('17:00');
  await press(t.booking.mobile.takePhoto);
  await screen.findByLabelText(t.booking.invoice.label);
  await press(t.booking.next);
  await screen.findByRole('button', { name: t.booking.submit });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
  jest.mocked(pickReceipt).mockResolvedValue(PHOTO);
  jest.mocked(uploadInvoice).mockResolvedValue('req/0b1c.jpg');
});

test('missed lesson → teacher → slot of its length → invoice → «احجز»: one linked lesson, no subscription', async () => {
  await renderWithQuery(<MakeupWizard source={source} />);
  expect(screen.getByRole('header', { name: t.booking.makeup.title })).toBeTruthy();
  expect(screen.getByText('خطوة 1 من 4')).toBeTruthy();
  expect(screen.getByText(t.booking.mobile.makeupFor.replace('{name}', 'سهيلة'))).toBeTruthy();
  expect(screen.getByText(`${t.booking.mobile.missedLesson}: ${whenText(source.missedAt, 'Asia/Riyadh')}`)).toBeTruthy();

  await press(t.booking.mobile.keepTeacher.replace('{teacher}', maryam.display_name_ar));
  await press('17:00');
  const slots = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).find((p) => p.startsWith('/booking/slots'));
  expect(slots).toContain(`teacherId=${maryam.id}`);
  expect(slots).toContain('durationMin=60'); // the original's length

  // «الفاتورة *» is required for a makeup too; there is no «من الشات» (a lesson knows no guardian number).
  expect(screen.queryByRole('button', { name: t.booking.invoice.fromChat })).toBeNull();
  await press(t.booking.next);
  expect(await screen.findByText(t.booking.error.invoice_required)).toBeTruthy();
  await press(t.booking.mobile.takePhoto);
  await screen.findByLabelText(t.booking.invoice.label);
  await press(t.booking.next);

  expect(screen.getByText(t.booking.kind.makeup)).toBeTruthy();
  expect(screen.getByText(whenText(SUN_17, 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.queryByText(t.booking.pickDays, { exact: false })).toBeNull();
  mockApiSend.mockResolvedValue(booked(SUN_17));
  await press(t.booking.submit);
  expect(await screen.findByText(t.booking.makeup.booked)).toBeTruthy();
  const body = mockApiSend.mock.calls[0]?.[2];
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/booking', expect.objectContaining({
    kind: 'makeup',
    studentIds: [source.studentId],
    makeupOfLessonId: source.lessonId,
    teacherId: maryam.id,
    durationMin: 60,
    invoice: { source: 'upload', path: 'req/0b1c.jpg' },
  }));
  expect(body).not.toHaveProperty('package');
  expect(jest.mocked(uploadInvoice).mock.calls[0]?.[0]).toBe(body.clientRequestId);
  expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
  await press(t.common.close);
  expect(mockBack).toHaveBeenCalled();
});

test('a second makeup of the same lesson: the API’s 409 says so, and «احجز» stays to retry', async () => {
  await renderWithQuery(<MakeupWizard source={source} />);
  await walkToConfirm();
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'makeup_exists' }));
  await press(t.booking.submit);
  expect(await screen.findByText(t.booking.error.makeup_exists)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.submit })).toBeTruthy();
});

test('offline: the honest line, and the retry sends the same request id (books once)', async () => {
  await renderWithQuery(<MakeupWizard source={source} />);
  await walkToConfirm();
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed'));
  await press(t.booking.submit);
  expect(await screen.findByText(t.booking.mobile.offline)).toBeTruthy();
  mockApiSend.mockResolvedValueOnce(booked(SUN_17));
  await press(t.booking.submit);
  await screen.findByText(t.booking.makeup.booked);
  expect(mockApiSend.mock.calls[1]?.[2].clientRequestId).toBe(mockApiSend.mock.calls[0]?.[2].clientRequestId);
});

test('the API refusing the invoice (400 invoice_required) sends the admin back to «الفاتورة»', async () => {
  await renderWithQuery(<MakeupWizard source={source} />);
  await walkToConfirm();
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'invoice_required' }));
  await press(t.booking.submit);
  expect(await screen.findByText(t.booking.error.invoice_required)).toBeTruthy();
  await press(t.booking.invoice.replace);
  expect(await screen.findByText(t.booking.invoice.hint)).toBeTruthy();
});

test('a clash shows the lines with «اختار ميعاد تاني», which reopens the slots', async () => {
  await renderWithQuery(<MakeupWizard source={source} />);
  await walkToConfirm();
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'conflict', conflicts: [{ kind: 'teacher_busy', startsAt: SUN_17, endsAt: SUN_17 }] }));
  await press(t.booking.submit);
  await press(t.booking.changeSlot);
  expect(await screen.findByText(`${t.booking.pickTime} *`)).toBeTruthy();
});
