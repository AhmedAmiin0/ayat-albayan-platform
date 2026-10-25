import { useQuery } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { meQuery, type Me } from '@/features/auth/me';
import { t } from '@/lib/i18n/i18n';
import { isStaffRole } from './staff-link';

interface Props {
  /** The link's token: one lookup per link. */
  linkKey: string;
  /** Where this staff member's own room is behind the link; throws when they have none. */
  resolve: () => Promise<string>;
  children: ReactNode;
  /** Test seams: who is signed in, and the navigation (a full load, like «ادخل الحلقة»). */
  who?: () => Promise<Me | null>;
  go?: (path: string) => void;
}

const replace = (path: string) => window.location.replace(path);

/**
 * A shared link (/m/<token>, /join/<token>) opened by a signed-in admin or teacher sends them to
 * their own staff room, so they keep the board pen and screen share: entering as a guest left them
 * with «السبورة للعرض فقط» and a share button LiveKit refuses (owner, 2026-10-05). Everyone else,
 * and staff with no role in that room, get the guest page as before.
 */
export function StaffLinkGate({ linkKey, resolve, children, who, go = replace }: Props) {
  const me = useQuery({ ...meQuery, ...(who && { queryFn: who }), retry: false });
  const staff = isStaffRole(me.data?.role);
  const target = useQuery({
    queryKey: ['staff-link', linkKey, me.data?.id ?? ''],
    queryFn: resolve,
    enabled: staff,
    retry: false,
    staleTime: Infinity,
  });
  const path = target.data;
  useEffect(() => {
    if (path) go(path);
  }, [path, go]);

  const waiting = me.isPending || (staff && !target.isError);
  if (!waiting) return <>{children}</>;
  return (
    <main className="grid min-h-dvh place-items-center bg-page">
      <p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p>
    </main>
  );
}
