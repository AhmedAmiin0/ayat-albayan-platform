import { useEffect } from 'react';

/**
 * Runs `onFocus` when the browser window gets focus back (W13). TanStack's focusManager listens to
 * visibilitychange only: a chat whose poll stopped while another window had focus (api.ts
 * threadQuery) restarts here, keyed on the chat's phone. `onFocus` should be stable (a query's refetch).
 */
export function useWindowFocus(onFocus: () => unknown, key: string): void {
  useEffect(() => {
    const back = () => void onFocus();
    window.addEventListener('focus', back);
    return () => window.removeEventListener('focus', back);
  }, [onFocus, key]);
}
