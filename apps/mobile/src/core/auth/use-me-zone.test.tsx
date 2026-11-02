import { setViewerPersonTz, viewerTz } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { useViewerTz } from '@/core/lib/clock';
import { meTz, useMeZone } from './use-me-zone';

// jest.setup pins the device to Riyadh, so «no person tz» reads as Riyadh here.
afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('meTz reads /auth/me `tz`; missing, blank or not loaded is null', () => {
  expect(meTz({ role: 'teacher', tz: 'Africa/Cairo' })).toBe('Africa/Cairo');
  expect(meTz({ role: 'admin', tz: null })).toBeNull();
  expect(meTz({ role: 'admin', tz: '' })).toBeNull();
  expect(meTz(undefined)).toBeNull();
});

test('a signed-in teacher: the store and every useViewerTz read Cairo; ready once applied', async () => {
  const me = { role: 'teacher', tz: 'Africa/Cairo' };
  const hook = await renderHook(() => ({ ready: useMeZone(me, true), tz: useViewerTz() }));
  expect(viewerTz()).toBe('Africa/Cairo');
  expect(hook.result.current).toEqual({ ready: true, tz: 'Africa/Cairo' });
});

test('signed out: the person tz is cleared, the device zone again', async () => {
  setViewerPersonTz('Africa/Cairo');
  await renderHook(() => useMeZone({ tz: 'Africa/Cairo' }, false));
  expect(viewerTz()).toBe('Asia/Riyadh');
});

test('useViewerTz re-renders on a change', async () => {
  const hook = await renderHook(() => useViewerTz());
  expect(hook.result.current).toBe('Asia/Riyadh');
  await act(() => setViewerPersonTz('Africa/Cairo'));
  expect(hook.result.current).toBe('Africa/Cairo');
});
