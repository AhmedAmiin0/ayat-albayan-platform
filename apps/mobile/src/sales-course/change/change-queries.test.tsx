import type { CourseChangeRequest } from '@ab/shared';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useCourseChangeCheck } from './change-queries';
import { SUB_ID } from '../fixtures';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const body: CourseChangeRequest = {
  subscriptionId: SUB_ID,
  byday: [1, 3],
  startTimeLocal: '18:00',
  startsOn: '2026-10-05',
  startsAt: '2026-10-05T15:00:00.000Z',
  clientRequestId: '00000000-0000-4000-8000-000000000001',
};
const check = { conflicts: [], remaining: 5, endsOn: '2026-10-21' };

test('the check is dropped once unmounted, so the same picks after a save ask the server again', async () => {
  mockApiSend.mockResolvedValue(check);
  const client = createTestQueryClient();
  const { result, unmount } = await renderHook(() => useCourseChangeCheck(body), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.data).toEqual(check));
  await unmount();
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['sales', 'booking', 'course-change'] })).toHaveLength(0));
});
