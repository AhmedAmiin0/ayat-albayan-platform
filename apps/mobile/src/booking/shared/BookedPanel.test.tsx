import { setViewerPersonTz } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BookedPanel } from './BookedPanel';

const mockReplace = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: async () => ({}) }));
jest.mock('expo-router', () => ({ router: { replace: (h: unknown) => mockReplace(h) } }));

const result = {
  rule_id: 'r1',
  invoice_id: 'i1',
  student_ids: ['s1'],
  guardian_ids: ['g1'],
  lessons: [{ id: 'l1', starts_at: '2026-10-04T21:30:00.000Z', ends_at: '2026-10-04T22:15:00.000Z' }],
  message_ids: [],
};

beforeEach(() => jest.clearAllMocks());
afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('a booked makeup opens the schedule on its day for a Riyadh viewer, or closes', async () => {
  setViewerPersonTz('Asia/Riyadh');
  const onDone = jest.fn();
  await renderWithQuery(<BookedPanel makeup result={result} teacherName="أبرار" tz="Africa/Cairo" onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: t.booking.openSchedule }));
  // 21:30 UTC is already the 5th in Riyadh (UTC+3)
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/schedule', params: { date: '2026-10-05' } });
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('a Cairo viewer: the schedule opens on her day, where the lesson sits on her calendar', async () => {
  setViewerPersonTz('Africa/Cairo');
  await renderWithQuery(<BookedPanel makeup result={result} teacherName="أبرار" tz="Asia/Riyadh" onDone={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: t.booking.openSchedule }));
  // 21:30 UTC is 23:30 on the 4th in Cairo (UTC+2), though the 5th in Riyadh
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/schedule', params: { date: '2026-10-04' } });
});

test('without lessons.read the Schedule tab is hidden: no «افتح الجدول» button, only close', async () => {
  const client = createTestQueryClient();
  // Fresh forever: a mount refetch would answer the mocked `{}` (no permissions = hide nothing) and race the assertion.
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: ['inbox.read'] });
  await renderWithQuery(<BookedPanel makeup result={result} teacherName="أبرار" tz="Africa/Cairo" onDone={jest.fn()} />, client);
  expect(screen.queryByRole('button', { name: t.booking.openSchedule })).toBeNull();
  expect(screen.getByRole('button', { name: t.common.close })).toBeTruthy();
});
