import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { Logo } from '@/components/ui/mark';
import { hasStoredSession } from '@/features/auth/end-session';
import { signOut } from '@/features/auth/sign-in';
import { t } from '@/lib/i18n';
import { LanguageSwitch } from './LanguageSwitch';

const E = t.auth.appError;
type Busy = 'retry' | 'logout' | null;

/**
 * The app's one error screen (the root route's errorComponent): a section guard or page that fails
 * with anything but a redirect (e.g. /auth/me down) lands here, never on the router's built-in
 * English box. «إعادة المحاولة» reloads the routes; «تسجيل الخروج» always ends this browser's
 * session (the bounded signOut) and opens /login. It shows only while a session is stored: the
 * public pages (/join, /s, /m, /feedback) have no account to leave, so they get retry alone.
 */
export function AppError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<Busy>(null);
  const signedIn = hasStoredSession();

  const run = async (kind: Exclude<Busy, null>, work: () => Promise<void>) => {
    setBusy(kind);
    try {
      await work();
    } finally {
      setBusy(null);
      reset();
    }
  };
  const retry = () => run('retry', () => router.invalidate());
  const logout = () =>
    run('logout', async () => {
      await signOut(queryClient);
      await navigate({ to: '/login' });
    });

  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{E.title}</Cartouche>
        <FormAlert>{signedIn ? E.body : E.bodyPublic}</FormAlert>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy !== null} onClick={() => void retry()}>
            {busy === 'retry' ? E.retrying : E.retry}
          </Button>
          {signedIn && (
            <Button variant="secondary" disabled={busy !== null} onClick={() => void logout()}>
              {busy === 'logout' ? E.leaving : t.auth.logout}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
