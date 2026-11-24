import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { searchAsked, subscribeSearchRequests, takeSearchRequest } from './search-request';

/** Opens once whether the chat was mounted when asked or opens later. */
export function useSearchRequest(phone: string, open: () => void): void {
  const asked = useSyncExternalStore(subscribeSearchRequests, () => searchAsked(phone));
  const take = useEffectEvent(() => {
    if (takeSearchRequest(phone)) open();
  });
  useEffect(() => {
    if (asked) take();
  }, [asked]);
}
