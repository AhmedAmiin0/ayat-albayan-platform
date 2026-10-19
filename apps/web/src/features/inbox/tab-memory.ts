import { clearAllDrafts } from './draft-store';
import { clearOwnSends } from './own-send';
import { registerDrafts } from './register-drafts';

/**
 * The inbox's three tab memories (unsent replies, her own last sends, half-typed registrations),
 * forgotten whenever the session ends: our «تسجيل الخروج», an account disabled mid-session
 * (features/auth/me.ts signs out directly), another tab signing out. A shared PC's next user finds none.
 */
export function clearTabMemories(): void {
  clearAllDrafts();
  clearOwnSends();
  registerDrafts.clearAll();
}
