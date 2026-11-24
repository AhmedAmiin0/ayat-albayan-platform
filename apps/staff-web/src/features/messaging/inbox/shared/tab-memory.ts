import { onSessionEnd } from '@ab/web-kit/lib/session/session-end';
import { clearAllDrafts } from '@/features/messaging/inbox/composer/lib/draft-store';
import { clearOwnSends } from '@/features/messaging/inbox/composer/lib/own-send';
import { quotePins } from '@/features/messaging/inbox/composer/quote/quote-id';
import { registerDrafts } from '@/features/messaging/inbox/sales/register-drafts';
import { clearAllStaged } from '@/features/messaging/inbox/saved-replies/lib/staged-store';

/** Cleared whenever the session ends, so a shared PC's next user finds none. */
export function clearTabMemories(): void {
  clearAllDrafts();
  clearAllStaged();
  clearOwnSends();
  quotePins.clear();
  registerDrafts.clearAll();
}

/** Boot: the kit's session end (sign-out, another tab, a disabled account) forgets these too. */
export function rememberUntilSessionEnd(): void {
  onSessionEnd(clearTabMemories);
}
