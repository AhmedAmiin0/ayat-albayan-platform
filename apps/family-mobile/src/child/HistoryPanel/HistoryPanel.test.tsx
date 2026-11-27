import type { PortalHistoryStatus } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { historyRow, student } from '@/portal/portal.fixtures';
import { HistoryPanel } from './HistoryPanel';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const kid = student();
const show = (status: PortalHistoryStatus) =>
  renderWithQuery(<HistoryPanel student={kid} status={status} />, freshQueryClient());
const pageAsked = () => mockFetch.mock.calls.some(([p]) => String(p).includes('cursor='));

beforeEach(() => jest.clearAllMocks());

test.each([
  ['attended', t.portal.attendedEmpty],
  ['absent', t.portal.absentEmpty],
] as const)('no %s lessons: its empty note and no «عرض المزيد»', async (status, empty) => {
  mockFetch.mockResolvedValue({ rows: [], next_cursor: null });
  await show(status);
  expect(await screen.findByText(empty)).toBeTruthy();
  expect(screen.queryByText(t.portal.more)).toBeNull();
});

test('absences: each row, then the note on where the reason comes from', async () => {
  const row = historyRow({ outcome: 'absent', absence_reason: 'سفر', report_id: null });
  mockFetch.mockResolvedValue({ rows: [row], next_cursor: null });
  await show('absent');
  expect(await screen.findByText('السبب: سفر')).toBeTruthy();
  expect(screen.getByText(t.portal.app.history.reasonNote)).toBeTruthy();
});

test('attended lessons never show the absence note', async () => {
  mockFetch.mockResolvedValue({ rows: [historyRow()], next_cursor: null });
  await show('attended');
  expect(await screen.findByText(t.portal.openReport)).toBeTruthy();
  expect(screen.queryByText(t.portal.app.history.reasonNote)).toBeNull();
});

test('a next page: «عرض المزيد» reads it with the cursor', async () => {
  const next = '2026-10-01T00:00:00Z';
  mockFetch.mockResolvedValue({ rows: [historyRow()], next_cursor: next });
  await show('attended');
  await fireEvent.press(await screen.findByText(t.portal.more));
  await waitFor(() => expect(pageAsked()).toBe(true));
});
