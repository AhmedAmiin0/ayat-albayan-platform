import { BackHandler } from 'react-native';

type BackListener = () => boolean | null | undefined;

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
    [...listeners].reverse().some((listener) => listener() === true);
  };
}
