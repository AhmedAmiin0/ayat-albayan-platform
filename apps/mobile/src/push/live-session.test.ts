import { supabase } from '@/core/lib/http/supabase';
import { hasLiveSession } from './live-session';

const getSession = jest.mocked(supabase.auth.getSession);
const NOW = Date.parse('2026-10-25T10:00:00Z');
const session = (expiresAt: number | undefined) =>
  ({ data: { session: { expires_at: expiresAt } }, error: null }) as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>;

test('a session whose access token is still valid is live', async () => {
  getSession.mockResolvedValueOnce(session(NOW / 1000 + 600));
  await expect(hasLiveSession(NOW)).resolves.toBe(true);
});

test('no session, an expired one (refresh failed offline) or no expiry: not live', async () => {
  await expect(hasLiveSession(NOW)).resolves.toBe(false); // jest.setup: signed out
  getSession.mockResolvedValueOnce(session(NOW / 1000 - 1));
  await expect(hasLiveSession(NOW)).resolves.toBe(false);
  getSession.mockResolvedValueOnce(session(undefined));
  await expect(hasLiveSession(NOW)).resolves.toBe(false);
  getSession.mockRejectedValueOnce(new Error('storage'));
  await expect(hasLiveSession(NOW)).resolves.toBe(false);
});
