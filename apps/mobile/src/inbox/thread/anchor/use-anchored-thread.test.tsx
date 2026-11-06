import { ApiError } from '@ab/client-core';
import { renderHook, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PHONE } from '@/inbox/shared/thread-fixtures';
import { useAnchoredThread } from './use-anchored-thread';

// The window around a hit that cannot open: the chat says why and goes back to the live chat.

const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({ router: { setParams: (p: unknown) => mockSetParams(p) } }));
const mockSay = jest.fn();
jest.mock('@/inbox/thread/hooks/chat-actions', () => ({
  useChatActions: () => ({ say: mockSay }),
}));
const mockGet = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockGet(p),
}));

const OLD = 'b2222222-2222-4222-8222-222222222222';

const open = () =>
  renderHook(() => useAnchoredThread(PHONE, OLD), {
    wrapper: queryWrapper(createTestQueryClient()),
  });

beforeEach(() => jest.clearAllMocks());

test('a gone hit (404) says so at once (no retry) and goes back to the live chat', async () => {
  mockGet.mockRejectedValue(new ApiError(404, { code: 'message_not_found' }));
  await open();
  await waitFor(() =>
    expect(mockSay).toHaveBeenCalledWith({ text: t.inbox.chatSearch.unreachable }),
  );
  expect(mockSetParams).toHaveBeenCalledWith({ msg: undefined });
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('a window that keeps failing (not 404) says the load error and goes back to live', async () => {
  mockGet.mockRejectedValue(new ApiError(500));
  await open();
  await waitFor(() => expect(mockSay).toHaveBeenCalledWith({ text: t.common.error }), {
    timeout: 8000,
  });
  expect(mockSetParams).toHaveBeenCalledWith({ msg: undefined });
  expect(mockGet).toHaveBeenCalledTimes(3);
}, 15_000);
