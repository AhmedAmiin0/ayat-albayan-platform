import { formatPhone } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));

const s = t.sales.student;
beforeEach(() => mockApiFetch.mockReset());

test('her student: the current subscription with its dates and lessons, the past one folded', async () => {
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1');
  expect(screen.getByText(`${ltr('AB-0183')} · ${ltr(formatPhone('+201001112223'))}`)).toBeTruthy();
  expect(screen.getByText(s.current)).toBeTruthy();
  expect(screen.getByText(t.sales.history.starts.replace('{date}', ltr('2026-10-01')))).toBeTruthy();
  expect(screen.getByText(t.sales.history.renews.replace('{date}', ltr('2026-11-01')))).toBeTruthy();
  expect(screen.getByText(`${t.sales.history.used.replace('{used}', '3').replace('{total}', '8')} · ${t.sales.history.remaining.replace('{n}', '5')}`)).toBeTruthy();
  // The past subscription is folded until asked for.
  expect(screen.queryByText(t.sales.history.ended.replace('{date}', ltr('2026-09-29')))).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: s.showPast.replace('{n}', '1') }));
  expect(screen.getByText(t.sales.history.ended.replace('{date}', ltr('2026-09-29')))).toBeTruthy();
  expect(screen.getByRole('button', { name: s.hidePast })).toBeTruthy();
  expect(screen.queryByText(/SAR|USD|EGP|\+\d{6,}/)).toBeNull();
});

test('attendance: the totals and one chip per past lesson; reports as the teacher\'s rows with the PDF', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('/pdf') ? { url: 'https://storage/x.pdf' } : details()));
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<SalesStudentScreen />);
  await screen.findByRole('header', { name: 'يوسف أحمد' });
  expect(screen.getByText(s.totals.replace('{present}', '1').replace('{absent}', '1').replace('{excused}', '0').replace('{cancelled}', '1'))).toBeTruthy();
  expect(screen.getByText(s.kind.present)).toBeTruthy();
  expect(screen.getByText(s.kind.absent)).toBeTruthy();
  expect(screen.getByText(s.kind.cancelled)).toBeTruthy();
  expect(screen.getByText(`${t.reports.lessonNoShort.replace('{n}', '12')} · ${t.enums.grade.excellent}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.reports.downloadPdf }));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://storage/x.pdf'));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1/reports/r1/pdf');
});

test('empty: no subscription, no past lesson, no report', async () => {
  mockApiFetch.mockResolvedValue(details({
    subscriptions: [], current_id: null,
    attendance: { items: [], totals: { present: 0, absent: 0, excused: 0, cancelled: 0, unmarked: 0 } },
    reports: { items: [], total: 0 },
  }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.noSubscription)).toBeTruthy();
  expect(screen.getByText(s.noAttendance)).toBeTruthy();
  expect(screen.getByText(t.reports.noReports)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /\(\d+\)/ })).toBeNull();
});

test('loading, then another family\'s student (404) reads «not yours»; another failure the load error with retry', async () => {
  let fail: (e: Error) => void = () => undefined;
  mockApiFetch.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
  const first = await renderWithQuery(<SalesStudentScreen />);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
  fail(new ApiError(404, { code: 'student_not_found' }));
  expect(await screen.findByText(s.notFound)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
});

test('the guardian phone is under the name and «محادثة ولي الأمر» opens that family’s chat in the sales inbox', async () => {
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${s.chat} ${ltr(formatPhone('+201001112223'))}` }));
  expect(router.push).toHaveBeenCalledWith('/sales/inbox/thread/%2B201001112223');
});

test('no guardian phone: the code alone under the name, no chat button', async () => {
  const d = details();
  mockApiFetch.mockResolvedValue({ ...d, student: { ...d.student, guardian_phone: null } });
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.queryByText(s.chat, { exact: false })).toBeNull();
});
