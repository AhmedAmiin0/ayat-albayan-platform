import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { ReportFiles } from './ReportFiles';

const mockSend = jest.fn<Promise<unknown>, unknown[]>();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const R = t.portal.app.report;
const PDF = 'https://files.example/page.pdf';
const SIGNED = { url: 'https://files.example/signed', expires_at: '2026-11-26T10:05:00Z' };
const opened = jest.spyOn(Linking, 'openURL');
const show = (pdfUrl: string | null, recordingId: string | null = null) =>
  renderWithQuery(
    <ReportFiles studentId="s1" reportId="r1" pdfUrl={pdfUrl} recordingId={recordingId} />,
    freshQueryClient(),
  );
const sentTo = (part: string) =>
  mockSend.mock.calls.some((args) => args.some((arg) => String(arg).includes(part)));

beforeEach(() => {
  jest.clearAllMocks();
  opened.mockResolvedValue(true);
  mockSend.mockResolvedValue(SIGNED);
});

test("the page's own link opens as it is, with no signing request", async () => {
  await show(PDF);
  await fireEvent.press(screen.getByRole('button', { name: R.pdf }));
  await waitFor(() => expect(opened).toHaveBeenCalledWith(PDF));
  expect(mockSend).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: R.recording })).toBeNull();
});

test("without the page's link the PDF asks the portal for a signed one", async () => {
  await show(null);
  await fireEvent.press(screen.getByRole('button', { name: R.pdf }));
  await waitFor(() => expect(opened).toHaveBeenCalledWith(SIGNED.url));
  expect(sentTo('/reports/r1/url')).toBe(true);
});

test('a visible recording opens through its own signed link', async () => {
  await show(PDF, 'rec1');
  await fireEvent.press(screen.getByRole('button', { name: R.recording }));
  await waitFor(() => expect(opened).toHaveBeenCalledWith(SIGNED.url));
  expect(sentTo('/recordings/rec1/url')).toBe(true);
});

test('a link that cannot be had shows the alert', async () => {
  mockSend.mockRejectedValue(new Error('down'));
  await show(null);
  await fireEvent.press(screen.getByRole('button', { name: R.pdf }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(t.portal.fileFailed)).toBeTruthy();
});
