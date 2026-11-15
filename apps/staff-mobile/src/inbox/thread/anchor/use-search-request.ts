import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { searchAsked, subscribeSearchRequests, takeSearchRequest } from './search-request';

/**
 * The chat under the student's details after «بحث في الرسائل»: its bar opens once (the ask is
 * taken), whether the chat was mounted when asked or opens later.
 */
export function useSearchRequest(phone: string, open: () => void): void {
  const asked = useSyncExternalStore(subscribeSearchRequests, () => searchAsked(phone));
  const take = useEffectEvent(() => {
    if (takeSearchRequest(phone)) open();
  });
  useEffect(() => {
    if (asked) take();
  }, [asked]);
}
