import { setViewerPersonTz, viewerTz } from '@ab/client-core';
import * as shared from '@ab/shared';
import { act, renderHook } from '@testing-library/react-native';
import { useMeZone } from './use-me-zone';

// The startup gate («جارٍ الاتصال») must open once and stay open (review of #462).
afterEach(() => setViewerPersonTz('Asia/Riyadh'));

const sharedMock: { deviceTimeZone: () => string | null } = shared;

test('the phone moving to another zone after start does not keep the gate shut', async () => {
  const before = sharedMock.deviceTimeZone;
  sharedMock.deviceTimeZone = () => 'Asia/Dubai';
  try {
    const hook = await renderHook(() => useMeZone({ role: 'admin', tz: null }, true));
    expect(viewerTz()).toBe('Asia/Riyadh');
    expect(hook.result.current).toBe(true);
  } finally {
    sharedMock.deviceTimeZone = before;
  }
});

test('a tz change on an /auth/me refetch keeps the gate open (no remount of the app)', async () => {
  const seen: boolean[] = [];
  const hook = await renderHook(
    ({ me }: { me: unknown }) => {
      const ready = useMeZone(me, true);
      seen.push(ready);
      return ready;
    },
    { initialProps: { me: { role: 'teacher', tz: 'Africa/Cairo' } } },
  );
  expect(hook.result.current).toBe(true);
  seen.length = 0;
  await act(() => hook.rerender({ me: { role: 'teacher', tz: 'Asia/Dubai' } }));
  expect(viewerTz()).toBe('Asia/Dubai');
  expect(seen).not.toContain(false);
});

test('signing out and in again waits for the new person’s zone once more', async () => {
  const hook = await renderHook(
    ({ me, signedIn }: { me: unknown; signedIn: boolean }) => useMeZone(me, signedIn),
    { initialProps: { me: { role: 'teacher', tz: 'Africa/Cairo' }, signedIn: true } },
  );
  await act(() => hook.rerender({ me: undefined, signedIn: false }));
  expect(viewerTz()).toBe('Asia/Riyadh');
  await act(() => hook.rerender({ me: { role: 'teacher', tz: 'Africa/Cairo' }, signedIn: true }));
  expect(hook.result.current).toBe(true);
  expect(viewerTz()).toBe('Africa/Cairo');
});
