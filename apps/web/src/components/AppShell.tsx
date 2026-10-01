import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/sign-in';
import { t } from '@/lib/i18n';

/** Signed-in layout shared by /admin, /teacher and /portal. `nav` renders under the header. */
export function AppShell({ title, nav }: { title: string; nav?: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <span className="font-semibold">{t.app.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await signOut(queryClient);
            await navigate({ to: '/login' });
          }}
        >
          {t.auth.logout}
        </Button>
      </header>
      {nav}
      <main className="p-4">
        <h1 className="mb-4 text-2xl font-bold">{title}</h1>
        <Outlet />
      </main>
    </div>
  );
}
