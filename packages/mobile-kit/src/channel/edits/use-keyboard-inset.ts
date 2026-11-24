import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** iOS tells before the keyboard moves, Android after. */
const EVENTS =
  Platform.OS === 'ios'
    ? ({ show: 'keyboardWillShow', hide: 'keyboardWillHide' } as const)
    : ({ show: 'keyboardDidShow', hide: 'keyboardDidHide' } as const);

/** A Modal is outside KeyboardFrame and edge to edge does not resize the window, so pad by hand. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener(EVENTS.show, (e) => setInset(e.endCoordinates.height));
    const hidden = Keyboard.addListener(EVENTS.hide, () => setInset(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return inset;
}
