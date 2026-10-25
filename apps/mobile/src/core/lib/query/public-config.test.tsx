import { PUBLIC_SETTING_DEFAULTS, type LessonView } from '@ab/shared';
import { renderHook, waitFor } from '@testing-library/react-native';
import { livePhase } from '@/live/live-filter';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { publicConfigQuery, useJoinWindow, usePublicConfig, useUploadMaxBytes } from './public-config';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

beforeEach(() => jest.clearAllMocks());

test('keeps the cache key and the 5-minute stale time the admin save invalidates', () => {
  expect(publicConfigQuery.queryKey).toEqual(['settings', 'public']);
  expect(publicConfigQuery.staleTime).toBe(300_000);
});

test('outside a QueryClientProvider: the registry defaults, and no request', async () => {
  const { result } = await renderHook(() => usePublicConfig());
  expect(result.current).toEqual(PUBLIC_SETTING_DEFAULTS);
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('reads GET /settings/public; the hooks follow the academy values', async () => {
  mockApiFetch.mockResolvedValue({ ...PUBLIC_SETTING_DEFAULTS, join_opens_before_min: 45, upload_max_mb: 3 });
  const wrapper = queryWrapper(createTestQueryClient());
  const { result } = await renderHook(() => ({ win: useJoinWindow(), max: useUploadMaxBytes() }), { wrapper });
  await waitFor(() => expect(result.current.win.opensBeforeMin).toBe(45));
  expect(result.current.max).toBe(3 * 1024 * 1024);
  expect(mockApiFetch).toHaveBeenCalledWith('/settings/public');
});

test('a wider join window makes a lesson «soon» earlier', () => {
  const lesson = { status: 'confirmed', starts_at: '2026-10-05T16:00:00Z', ends_at: '2026-10-05T16:45:00Z' } as LessonView;
  const now = new Date('2026-10-05T15:30:00Z');
  expect(livePhase(lesson, now)).toBeNull();
  expect(livePhase(lesson, now, { opensBeforeMin: 45, closesAfterMin: 120 })).toBe('soon');
});
