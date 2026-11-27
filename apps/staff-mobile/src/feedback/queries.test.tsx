import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { answered, page } from './fixtures';
import { useFeedbackList, useMyFeedback } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

beforeEach(() => mockApiFetch.mockReset());

const wrapper = () => ({ wrapper: queryWrapper(createTestQueryClient()) });
const average = { avg_rating: 4.5, n: 12, recommend_yes_pct: 83.3 };

test('the admin list reads its first page from the feedback list route', async () => {
  mockApiFetch.mockResolvedValue(page([answered]));
  const { result } = await renderHook(() => useFeedbackList(), wrapper());
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockApiFetch).toHaveBeenCalledWith('/feedback?page=1&pageSize=25');
  expect(result.current.items.map((row) => row.id)).toEqual(['f-1']);
  expect(result.current.total).toBe(1);
});

test('an admin list answer without its page fields is refused, not shown', async () => {
  mockApiFetch.mockResolvedValue({ items: [answered] });
  // The list re-renders only for the fields a render reads, so the render reads isError.
  const { result } = await renderHook(() => {
    const list = useFeedbackList();
    return { isError: list.isError, items: list.items };
  }, wrapper());
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.items).toEqual([]);
});

test('my feedback reads the teacher route with its average', async () => {
  mockApiFetch.mockResolvedValue({ ...page([answered]), average });
  const { result } = await renderHook(() => useMyFeedback(), wrapper());
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/feedback');
  expect(result.current.data?.average).toEqual(average);
});

test('a teacher answer with a broken average is refused', async () => {
  mockApiFetch.mockResolvedValue({ ...page([]), average: { avg_rating: 'high' } });
  const { result } = await renderHook(() => useMyFeedback(), wrapper());
  await waitFor(() => expect(result.current.isError).toBe(true));
});
