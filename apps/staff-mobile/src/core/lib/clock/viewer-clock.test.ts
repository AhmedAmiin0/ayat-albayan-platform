import { setViewerPersonTz } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { setClockPref, useViewerClock } from '@/core/lib/clock';

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('useViewerClock follows the zone and the 12 / 24 h cycle in place', async () => {
  await act(async () => setClockPref('24'));
  const hook = await renderHook(() => useViewerClock());
  expect(hook.result.current).toEqual({ tz: 'Asia/Riyadh', cycle: '24' });
  await act(async () => setViewerPersonTz('Africa/Cairo'));
  await act(async () => setClockPref('12'));
  expect(hook.result.current).toEqual({ tz: 'Africa/Cairo', cycle: '12' });
});
