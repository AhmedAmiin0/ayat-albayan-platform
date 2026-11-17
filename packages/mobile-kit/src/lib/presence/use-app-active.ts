import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** In the foreground (iOS «inactive» still shows the app: only «background» is away). */
export function useAppActive(): boolean {
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setState);
    return () => sub.remove();
  }, []);
  return state !== 'background';
}
