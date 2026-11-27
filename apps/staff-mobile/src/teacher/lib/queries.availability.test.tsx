import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useMyAvailability } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const GRID = [{ id: 'a', weekday: 4, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' }];

beforeEach(() => mockApiFetch.mockReset());

const mount = async (id: string | undefined) =>
  (await renderHook(() => useMyAvailability(id), {
    wrapper: queryWrapper(createTestQueryClient()),
  })).result;

test('my grid is read from the availability route once my id is known', async () => {
  mockApiFetch.mockResolvedValue(GRID);
  const result = await mount('t1');
  await waitFor(() => expect(result.current.data).toEqual(GRID));
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/t1/availability');
});

test('without my id nothing is read', async () => {
  const result = await mount(undefined);
  expect(result.current.fetchStatus).toBe('idle');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('a grid answer that is not a list of slots is an error', async () => {
  mockApiFetch.mockResolvedValue({ rows: GRID });
  const result = await mount('t1');
  await waitFor(() => expect(result.current.isError).toBe(true));
});
