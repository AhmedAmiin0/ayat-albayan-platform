import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

export const FAKE_KEYBOARD_EVENT = 'fake-keyboard-top';

/** The fake keyboard's top in window points, null while it is closed. */
export function useFakeKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FAKE_KEYBOARD_EVENT, setTop);
    return () => sub.remove();
  }, []);
  return top;
}
