import { apiSend } from '@/lib/api';

/** What the activity log is told about a Supabase sign-in (the API never sees the sign-in itself). */
export type SessionEvent = 'login' | 'logout' | 'login-failed';

/**
 * POST /activity/session/<event> for «سجل النشاط». No body: no email, no password. Never throws
 * and never blocks sign-in: a failed report is dropped. `logout` must run before signOut (it needs
 * the still-valid token); `login-failed` goes without one.
 */
export async function reportSession(event: SessionEvent): Promise<void> {
  try {
    await apiSend('POST', `/activity/session/${event}`);
  } catch {
    // Logging must never get in the way of signing in or out.
  }
}
