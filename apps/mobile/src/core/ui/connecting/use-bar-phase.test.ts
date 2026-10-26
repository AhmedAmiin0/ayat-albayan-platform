import { act, renderHook } from '@testing-library/react-native';
import type { ConnState } from '@/core/lib/connectivity/connectivity-machine';
import { useBarPhase } from './use-bar-phase';

jest.useFakeTimers();
type Props = Pick<ConnState, 'status' | 'since'>;
const online: Props = { status: 'online', since: null };

async function mount() {
  return renderHook((props: Props) => useBarPhase(props), { initialProps: online });
}

test('a request that fails and recovers within 800 ms never shows the bar', async () => {
  const hook = await mount();
  await hook.rerender({ status: 'connecting', since: Date.now() });
  await act(async () => void jest.advanceTimersByTime(799));
  expect(hook.result.current).toBe('hidden');
  await hook.rerender(online);
  expect(hook.result.current).toBe('hidden');
});

test('800 ms → connecting, 10 s → the hint, online → «تم الاتصال» for 1.5 s, then hidden', async () => {
  const hook = await mount();
  await hook.rerender({ status: 'connecting', since: Date.now() });
  await act(async () => void jest.advanceTimersByTime(800));
  expect(hook.result.current).toBe('connecting');
  await act(async () => void jest.advanceTimersByTime(9200));
  expect(hook.result.current).toBe('check');
  await hook.rerender(online);
  expect(hook.result.current).toBe('connected');
  await act(async () => void jest.advanceTimersByTime(1500));
  expect(hook.result.current).toBe('hidden');
});

test('connecting since earlier (the bar mounts late): the phase counts from `since`', async () => {
  const hook = await renderHook((props: Props) => useBarPhase(props), {
    initialProps: { status: 'connecting', since: Date.now() - 12_000 },
  });
  await act(async () => void jest.advanceTimersByTime(0));
  expect(hook.result.current).toBe('check');
});
