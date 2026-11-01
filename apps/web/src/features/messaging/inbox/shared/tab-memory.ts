import { clearAllDrafts } from '@/features/messaging/inbox/composer/lib/draft-store';
import { clearOwnSends } from '@/features/messaging/inbox/composer/lib/own-send';
import { registerDrafts } from '@/features/messaging/inbox/sales/register-drafts';
import { clearAllStaged } from '@/features/messaging/inbox/saved-replies/lib/staged-store';

/**
 * The inbox's tab memories (unsent replies, staged reply attachments, her own last sends, half-typed registrations),
 * forgotten whenever the session ends: our «تسجيل الخروج», an account disabled mid-session
 * (features/auth/me.ts signs out directly), another tab signing out. A shared PC's next user finds none.
 */
export function clearTabMemories(): void {
  clearAllDrafts();
  clearAllStaged();
  clearOwnSends();
  registerDrafts.clearAll();
}
