import { renderHook, waitFor } from '@testing-library/react-native';
import { logWarning } from '../../../lib/log/log';
import { usePreventCapture } from '../use-prevent-capture';

const mockGuard = { block: jest.fn(async () => undefined), allow: jest.fn(async () => undefined) };
jest.mock('../capture-guard.registry', () => ({ captureGuard: () => mockGuard }));
jest.mock('../../../lib/log/log', () => ({ logWarning: jest.fn() }));

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => jest.clearAllMocks());

test('blocked: capture is prevented at mount, and not again on a re-render', async () => {
  const view = await renderHook(() => usePreventCapture(true));
  await view.rerender(undefined);
  await settled();
  expect(mockGuard.block).toHaveBeenCalledTimes(1);
  expect(mockGuard.allow).not.toHaveBeenCalled();
});

test('allowed, then blocked again when the answer changes', async () => {
  const view = await renderHook(({ blocked }: { blocked: boolean }) => usePreventCapture(blocked), {
    initialProps: { blocked: true },
  });
  await view.rerender({ blocked: false });
  await waitFor(() => expect(mockGuard.allow).toHaveBeenCalledTimes(1));
  await view.rerender({ blocked: true });
  await waitFor(() => expect(mockGuard.block).toHaveBeenCalledTimes(2));
});

test('unmounting leaves the block on', async () => {
  const view = await renderHook(() => usePreventCapture(true));
  await view.unmount();
  await settled();
  expect(mockGuard.allow).not.toHaveBeenCalled();
});

test('a failed native call is logged without its values and never thrown', async () => {
  mockGuard.block.mockRejectedValueOnce(new Error('secret detail'));
  await renderHook(() => usePreventCapture(true));
  await waitFor(() => expect(logWarning).toHaveBeenCalledTimes(1));
  expect(JSON.stringify(jest.mocked(logWarning).mock.calls)).not.toContain('secret detail');
});

test('a guard that throws at once is caught too', async () => {
  mockGuard.allow.mockImplementationOnce(() => {
    throw new Error('sync');
  });
  await renderHook(() => usePreventCapture(false));
  await waitFor(() => expect(logWarning).toHaveBeenCalledTimes(1));
});
