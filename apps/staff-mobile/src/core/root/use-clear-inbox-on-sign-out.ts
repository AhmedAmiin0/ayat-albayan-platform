import { useEffect } from 'react';
import type { GateStatus } from '@ab/mobile-kit';
import { clearInboxOnSignOut } from '@/inbox';

/**
 * The chats' unsent drafts, a pending search ask and the phone's message store go with the
 * session (docs/43 43-7).
 */
export function useClearInboxOnSignOut(gate: GateStatus): void {
  useEffect(() => {
    if (gate === 'out') clearInboxOnSignOut();
  }, [gate]);
}
