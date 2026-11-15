import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Is the app in the foreground? Calls poll, subscribe and ring only then (docs/28 §1: no push in PR 2). */
export function useForeground(): boolean {
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setState);
    return () => sub.remove();
  }, []);
  // iOS «inactive» (control centre, a call sheet) still shows the app: only «background» is away.
  return state !== 'background';
}
