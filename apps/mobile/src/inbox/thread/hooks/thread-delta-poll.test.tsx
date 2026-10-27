import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, detail, message, PHONE } from '../../shared/thread-fixtures';
import { sendKey, threadKey, type ThreadCache } from './thread-cache';
import { useThreadDeltaPoll } from './thread-delta-poll';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));
// A fast tick for the test; the real one is 10 s.
jest.mock('@ab/client-core', () => ({ ...jest.requireActual('@ab/client-core'), THREAD_DELTA_MS: 30 }));

const PATH = `/threads/${encodeURIComponent(PHONE)}`;
const held = message({ id: 'm1', direction: 'inbound', created_at: '2026-10-27T10:00:00Z' });
const fresh = message({ id: 'm2', direction: 'inbound', body: 'جديد', created_at: '2026-10-27T10:01:00Z' });
const deltaCalls = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith(`${PATH}?after=`));

async function setup(live = true) {
  const client = createTestQueryClient();
  client.setQueryData<ThreadCache>(threadKey(PHONE), cachedThread(detail([held])));
  const hook = await renderHook(() => useThreadDeltaPoll(PHONE, live), { wrapper: queryWrapper(client) });
  return { client, hook };
}
const idsOf = (client: ReturnType<typeof createTestQueryClient>) =>
  client.getQueryData<ThreadCache>(threadKey(PHONE))?.pages[0]?.messages.map((m) => m.id);

beforeEach(() => mockApiFetch.mockReset());

describe('useThreadDeltaPoll: an open chat stays live on ~2 reads a tick', () => {
  it('asks for rows after the newest held and folds them into the newest page', async () => {
    mockApiFetch.mockResolvedValue({ messages: [fresh], has_more: false, pending: [] });
    const { client, hook } = await setup();
    await waitFor(() => expect(idsOf(client)).toEqual(['m1', 'm2']));
    expect(new URLSearchParams(deltaCalls()[0]?.split('?')[1]).get('after')).toBe('2026-10-27T10:00:00.000Z');
    expect(mockApiFetch.mock.calls.some((c: unknown[]) => c[0] === PATH)).toBe(false); // never the whole page
    await hook.unmount();
  });

  it('a send in flight wins: the delta is dropped, the cache untouched', async () => {
    mockApiFetch.mockResolvedValue({ messages: [fresh], has_more: false, pending: [] });
    const client = createTestQueryClient();
    client.setQueryData<ThreadCache>(threadKey(PHONE), cachedThread(detail([held])));
    jest.spyOn(client, 'isMutating').mockImplementation((f) => (JSON.stringify(f?.mutationKey) === JSON.stringify(sendKey(PHONE)) ? 1 : 0));
    const hook = await renderHook(() => useThreadDeltaPoll(PHONE, true), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(deltaCalls().length).toBeGreaterThan(0));
    expect(idsOf(client)).toEqual(['m1']);
    await hook.unmount();
  });

  it('a gap (more rows than one delta) re-reads the thread instead of merging', async () => {
    mockApiFetch.mockResolvedValue({ messages: [fresh], has_more: true, pending: [] });
    const client = createTestQueryClient();
    client.setQueryData<ThreadCache>(threadKey(PHONE), cachedThread(detail([held])));
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const hook = await renderHook(() => useThreadDeltaPoll(PHONE, true), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: threadKey(PHONE) }));
    expect(idsOf(client)).toEqual(['m1']);
    await hook.unmount();
  });

  it('not live (screen blurred, nothing loaded yet): no request at all', async () => {
    const { hook } = await setup(false);
    await new Promise((r) => setTimeout(r, 120));
    expect(mockApiFetch).not.toHaveBeenCalled();
    await hook.unmount();
  });
});
