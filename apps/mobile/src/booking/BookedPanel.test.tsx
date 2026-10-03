import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { BookedPanel } from './BookedPanel';

const mockReplace = jest.fn();
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

test('a booked makeup opens the schedule on its Riyadh day, or closes', async () => {
  const onDone = jest.fn();
  await render(<BookedPanel makeup result={result} teacherName="أبرار" tz="Africa/Cairo" onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: t.booking.openSchedule }));
  // 21:30 UTC is already the 5th in Riyadh (UTC+3)
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/schedule', params: { date: '2026-10-05' } });
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onDone).toHaveBeenCalledTimes(1);
});
