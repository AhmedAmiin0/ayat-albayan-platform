import { onlineManager } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const isActive = (state: AppStateStatus): boolean => state === 'active';

/** Runs `onResume` when the phone is back online or the app comes back to the foreground. */
export function useOnResume(onResume: () => void): void {
  const resume = useEffectEvent(onResume);
  useEffect(() => {
    const offOnline = onlineManager.subscribe((online) => {
      if (online) resume();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (isActive(state)) resume();
    });
    return () => {
      offOnline();
      app.remove();
    };
  }, []);
}
