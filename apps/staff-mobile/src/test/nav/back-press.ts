import { BackHandler, type HardwareBackPressEvent } from 'react-native';

type BackListener = (event: HardwareBackPressEvent) => boolean | null | undefined;

const PRESS: HardwareBackPressEvent = { type: 'hardwareBackPress', timeStamp: 0 };

/**
 * Android's back in a test: every hardwareBackPress listener is kept, and a press runs them newest
 * first until one handles it, as React Native does (React Navigation's own one included).
 */
export function trackBackPress(): () => void {
  const listeners = new Set<BackListener>();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
      },
    };
  });
  return () => {
    [...listeners].reverse().some((listener) => listener(PRESS) === true);
  };
}
