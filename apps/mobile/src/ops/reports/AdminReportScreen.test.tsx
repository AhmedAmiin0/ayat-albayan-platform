import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AdminReportScreen } from './AdminReportScreen';
import { report } from '../shared/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
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
