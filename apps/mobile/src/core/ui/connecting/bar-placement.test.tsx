import { act, render, renderHook } from '@testing-library/react-native';
import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext';
import type { ComponentProps, ReactNode } from 'react';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { claimBarSlot, useBarSlotClaimed } from './bar-slot';
import { useScreenFocused } from './use-screen-focus';

// Where the bar goes: a focused screen's large title claims it; otherwise the root shows it under the safe area.
type Navigation = NonNullable<ComponentProps<typeof NavigationContext.Provider>['value']>;

function fakeNavigation(focused: boolean) {
  const listeners = new Map<string, () => void>();
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, listener: () => void) => {
      listeners.set(event, listener);
      return () => listeners.delete(event);
    },
  };
  const set = (next: boolean) => {
    focused = next;
    listeners.get(next ? 'focus' : 'blur')?.();
  };
  return { navigation: navigation as unknown as Navigation, set };
}

test('the slot is claimed while any header holds it; a release is counted once', async () => {
  const { result } = await renderHook(() => useBarSlotClaimed());
  expect(result.current).toBe(false);
  const release = await act(async () => claimBarSlot());
  expect(result.current).toBe(true);
  await act(async () => {
    release();
    release();
  });
  expect(result.current).toBe(false);
});

test('outside a navigator a screen counts as focused; inside, it follows focus and blur', async () => {
  expect((await renderHook(() => useScreenFocused())).result.current).toBe(true);
  const { navigation, set } = fakeNavigation(false);
  const wrapper = ({ children }: { children: ReactNode }) => <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>;
  const { result } = await renderHook(() => useScreenFocused(), { wrapper });
  expect(result.current).toBe(false);
  await act(async () => set(true));
  expect(result.current).toBe(true);
});

test('a focused screen title takes the bar, a blurred one gives it back, a sheet title never takes it', async () => {
  const { result } = await renderHook(() => useBarSlotClaimed());
  const { navigation, set } = fakeNavigation(true);
  const screen = await render(
    <NavigationContext.Provider value={navigation}>
      <ScreenHeader title="اليوم" />
    </NavigationContext.Provider>,
  );
  expect(result.current).toBe(true);
  await act(async () => set(false));
  expect(result.current).toBe(false);
  await screen.unmount();
  await render(<ScreenHeader title="ورقة" size="h2" />);
  expect(result.current).toBe(false);
});
