import type { ReportFormResponse } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { reportFormKey } from './api';
import { formResponse } from './fixtures';
import { ReportFormScreen } from './ReportFormScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ lessonId: 'l-1' }),
}));
const mockPick = jest.fn();
jest.mock('@/payments/receipt', () => ({ pickReceipt: (s: string) => mockPick(s) }));
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: (...a: unknown[]) => mockUpload(...a) }) } },
}));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };

function serve(form: ReportFormResponse) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/teachers/me' ? me : form));
  return renderWithQuery(<ReportFormScreen />);
}

beforeEach(() => jest.clearAllMocks());

test('the Google Form’s questions: identity read-only, الحضور, the done fields, 6 rubrics + overall, after fields', async () => {
  await serve(formResponse());
  expect(await screen.findByText(t.reports.readOnlyHint)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/lessons/l-1/report-form');
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByText(ltr('AB-0182'))).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.program.quran, checked: true })).toBeTruthy();
  for (const a of Object.values(t.enums.attendance)) expect(screen.getByRole('radio', { name: a })).toBeTruthy();
  // Every grade row offers the form's five grades: six rubrics and التقدير العام.
  expect(screen.getAllByRole('radio', { name: t.enums.grade.needs_review })).toHaveLength(7);
  expect(screen.getByText(`${t.reports.overall} *`)).toBeTruthy();
  // Required in the form when attended: «*»; theory and next plan are not.
  for (const k of ['recited', 'notes', 'homework'] as const) expect(screen.getByText(`${t.reports[k]} *`)).toBeTruthy();
  expect(screen.getByText(t.reports.theory)).toBeTruthy();
  expect(screen.getByText(t.reports.nextPlan)).toBeTruthy();
  expect(screen.getByText(t.reports.submit)).toBeTruthy();
});

test('reopening: an older saved copy never seeds the fields over the server’s newer draft', async () => {
  const client = createTestQueryClient();
  client.setQueryData(reportFormKey('l-1'), formResponse());
  mockApiFetch.mockImplementation(async (p: string) => (p === '/teachers/me' ? me : formResponse({ recited: 'الفاتحة' })));
  await renderWithQuery(<ReportFormScreen />, client);
  await waitFor(() => expect(screen.getByLabelText(t.reports.recited).props.value).toBe('الفاتحة'));
});

test('a sent report past its edit window is read-only: no submit, says why', async () => {
  const sent = { status: 'submitted' as const, version: 2, can_edit: false, attendance: 'on_time' as const, recited: 'الفاتحة' };
  await serve(formResponse(sent));
  expect(await screen.findByText(t.reports.editClosed)).toBeTruthy();
  expect(screen.queryByText(t.reports.submit)).toBeNull();
  expect(screen.queryByText(t.reports.resubmit)).toBeNull();
  expect(screen.getByRole('radio', { name: t.enums.attendance.on_time }).props.accessibilityState).toMatchObject({
    checked: true,
    disabled: true,
  });
  expect(screen.getByLabelText(t.reports.recited).props.editable).toBe(false);
  expect(screen.queryByText(t.payments.mobile.pickPhoto)).toBeNull();
});

test('a photo from the gallery: signed upload of its bytes, then registered on the report', async () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  mockPick.mockResolvedValue({ uri: 'file:///p.jpg', mime: 'image/jpeg', bytes, size: 3 });
  mockUpload.mockResolvedValue({ data: {}, error: null });
  mockApiSend.mockImplementation(async (_m: string, p: string) =>
    p.endsWith('/upload-url')
      ? { bucket: 'report-attachments', path: 'r-1/a.jpg', token: 'tok', signed_url: 'x' }
      : { id: 'a-1', storage_path: 'r-1/a.jpg', mime: 'image/jpeg', size: 3, created_at: '2026-10-03T14:00:00Z' },
  );
  await serve(formResponse());
  await fireEvent.press(await screen.findByText(t.payments.mobile.pickPhoto));
  expect(await screen.findByText(new RegExp(t.reports.fileKind.image))).toBeTruthy();
  expect(mockPick).toHaveBeenCalledWith('library');
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/reports/r-1/attachments/upload-url', { mime: 'image/jpeg', size: 3 });
  expect(mockUpload).toHaveBeenCalledWith('r-1/a.jpg', 'tok', bytes, { contentType: 'image/jpeg' });
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/reports/r-1/attachments', { mime: 'image/jpeg', size: 3, path: 'r-1/a.jpg' }),
  );
});
