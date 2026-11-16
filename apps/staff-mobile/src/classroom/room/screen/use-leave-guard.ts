import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext';
import { use, useEffect, useEffectEvent, useRef } from 'react';

/**
 * While in the room, Android's back (and any other pop of this screen) asks «تغادر الحلقة؟» first
 * instead of dropping the lesson (canvas RoomXLeave). `release` lets the screen's own exit through.
 * Outside a navigator (tests of the bare screen) it does nothing.
 */
export function useLeaveGuard(active: boolean, onAsk: () => void) {
  const navigation = use(NavigationContext);
  const released = useRef(false);
  const ask = useEffectEvent(onAsk);
  useEffect(() => {
    if (!navigation || !active) return undefined;
    return navigation.addListener('beforeRemove', (e) => {
      if (released.current) return;
      e.preventDefault();
      ask();
    });
  }, [navigation, active]);
  return {
    release: () => {
      released.current = true;
    },
  };
}
