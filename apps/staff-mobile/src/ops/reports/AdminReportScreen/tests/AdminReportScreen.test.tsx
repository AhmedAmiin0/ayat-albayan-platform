import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { reportRoutes } from '@ab/shared';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { AdminReportScreen } from '@/ops/reports/AdminReportScreen/AdminReportScreen';
import { report } from '@/ops/shared/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ reportId: 'r1' }),
}));

test('the whole report read-only; a blank field says so; the PDF opens', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/reports/r1'
      ? report()
      : { url: 'https://x/r1.pdf', expires_at: '2026-10-05T10:00:00Z' },
  );
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
  expect(screen.getByText(t.enums.attendance.on_time)).toBeTruthy();
  expect(screen.getAllByText(t.mobileAdmin.reports.noContent).length).toBeGreaterThan(0);
  expect(screen.getByText(t.reports.version.replace('{n}', '2'))).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.reports.downloadPdf }));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://x/r1.pdf'));
  open.mockRestore();
});

test('a PDF still rendering shows its state instead of a button', async () => {
  mockApiFetch.mockResolvedValue(report({ pdf_status: 'rendering' }));
  await renderWithQuery(<AdminReportScreen />);
  expect(
    await screen.findByText(`${t.reports.pdfLabel}: ${t.enums.pdfStatus.rendering}`),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.reports.downloadPdf })).toBeNull();
});

test('a failed read: error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
});

test('an answer that is not a report: error with retry, never a half page', async () => {
  mockApiFetch.mockResolvedValue({ id: 'r1' });
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.reports.downloadPdf })).toBeNull();
});

test('a PDF link that cannot be read says the PDF is not ready', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/reports/r1' ? report() : {}));
  await renderWithQuery(<AdminReportScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.reports.downloadPdf }));
  expect(await screen.findByText(t.reports.error.pdf_not_ready)).toBeTruthy();
});

test('the report is cached under its route key', async () => {
  mockApiFetch.mockResolvedValue(report());
  const client = createTestQueryClient();
  await renderWithQuery(<AdminReportScreen />, client);
  expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
  expect(client.getQueryData(reportRoutes.get.key.of({ id: 'r1' }))).toEqual(report());
});
