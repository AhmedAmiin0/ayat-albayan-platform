import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import TodayRoute from '../../app/(tabs)/index';
import { done, lesson, muscat, pending } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

// يوسف (s1) has a lesson at 16:00 and another at 18:00; جنى (s2) has no package yet.
const later = lesson({ id: 'l-later', starts_at: '2026-10-01T15:00:00.000Z', ends_at: '2026-10-01T15:45:00.000Z' });
const twoLeft = balanceOf(subscription());

function serve(threshold = 2) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/lessons/day')) return [done, pending, muscat, later];
    if (path === '/students/s1/balance') return twoLeft;
    if (path === '/students/s2/balance') return balanceOf();
    if (path === '/settings') return { renewal_alert_remaining: threshold };
    throw new ApiError(404);
  });
}

const colorOf = (node: { props: { style: unknown } }) => {
  const style = node.props.style;
  return (Array.isArray(style) ? Object.assign({}, ...style) : style).color as string;
};

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('each card shows its student\'s package line, saffron at the renewal threshold', async () => {
  serve();
  await renderWithQuery(<TodayRoute />);
  const lines = await screen.findAllByText('فاضل حلقتين');
  expect(lines).toHaveLength(2);
  expect(colorOf(lines[0] as never)).toBe(palette.light.act);
});

test('one balance read per student, however many cards; none for an ended lesson', async () => {
  serve();
  await renderWithQuery(<TodayRoute />);
  await screen.findAllByText('فاضل حلقتين');
  const asked = mockApiFetch.mock.calls.map(([path]: [string]) => path);
  expect(asked.filter((p) => p === '/students/s1/balance')).toHaveLength(1);
  expect(asked).toContain('/students/s2/balance');
  // جودى (s3) only has the ended 10:00 lesson: a compact row, no line.
  expect(asked).not.toContain('/students/s3/balance');
});

test('above the threshold the line is ink; a student without a package has none', async () => {
  serve(1);
  await renderWithQuery(<TodayRoute />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/settings'));
  const lines = await screen.findAllByText('فاضل حلقتين');
  await waitFor(() => expect(colorOf(lines[0] as never)).toBe(palette.light.ink2));
  expect(screen.queryByText(/الباقة خلصت|فاضل \d/)).toBeNull();
});

test('a student the API flags as unpaid gets «الباقة مش مدفوعة» (R-SUB-02)', async () => {
  const flagged = { ...pending, students: pending.students.map((s) => ({ ...s, unpaid: true })) };
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/lessons/day')) return [flagged, muscat];
    throw new ApiError(404);
  });
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findAllByText('الباقة مش مدفوعة')).toHaveLength(1);
});
