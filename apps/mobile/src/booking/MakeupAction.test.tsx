import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { jana, lesson, yusuf } from '@/today/fixtures';
import { MakeupAction } from './MakeupAction';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

// «الأربعاء 30 سبتمبر»: three days before the fake now.
const recent = { starts_at: '2026-09-30T13:00:00.000Z', ends_at: '2026-09-30T13:45:00.000Z' };
const row = (over: Parameters<typeof lesson>[0]) => lesson({ ...recent, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-03T10:00:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('a no_show lesson offers «حجز تعويضي» and opens the wizard for that student and lesson', async () => {
  await render(<MakeupAction lesson={row({ id: 'm1', status: 'no_show' })} />);
  await fireEvent.press(screen.getByRole('button', { name: `${t.booking.makeup.action} — يوسف أحمد` }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/students/makeup/[lessonId]',
    params: expect.objectContaining({ lessonId: 'm1', studentId: 's1', durationMin: '45', teacherId: 't1' }),
  });
});

test('a group lesson offers one per student still charged for it', async () => {
  const group = row({ id: 'm2', status: 'excused', students: [yusuf, jana, { ...jana, id: 's9', chargeable: false }] });
  await render(<MakeupAction lesson={group} />);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: `${t.booking.makeup.action} — جنى وليد` })).toBeTruthy();
});

test.each([
  ['a completed lesson', { status: 'completed' as const }],
  ['an admin cancellation (its unit was never used)', { status: 'cancelled_by_admin' as const }],
  ['a trial', { status: 'no_show' as const, trial: true }],
  ['a makeup itself', { status: 'no_show' as const, makeup: true }],
  ['one older than 60 days', { status: 'no_show' as const, starts_at: '2026-07-01T13:00:00.000Z' }],
])('%s offers nothing', async (_name, over) => {
  await render(<MakeupAction lesson={row({ id: 'x', ...over })} />);
  expect(screen.queryByRole('button')).toBeNull();
});
