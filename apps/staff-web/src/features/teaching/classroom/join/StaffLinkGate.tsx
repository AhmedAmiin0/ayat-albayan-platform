import { useQuery } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { meQuery, type Me, t } from '@ab/web-kit';
import { isStaffRole } from './staff-link';
import { classroomKeys } from '@/features/teaching/classroom/api/classroom.keys';

interface Props {
  /** The link's token: one lookup per link. */
  linkKey: string;
  /** Where this staff member's own room is behind the link; throws when they have none. */
  resolve: () => Promise<string>;
  children: ReactNode;
  /** Test seams: who is signed in, and the navigation (a full load, like joining). */
  who?: () => Promise<Me | null>;
  go?: (path: string) => void;
}

const replace = (path: string) => window.location.replace(path);

/** Staff on a shared link go to their staff room; as guests LiveKit refuses board and share. */
export function StaffLinkGate({ linkKey, resolve, children, who, go = replace }: Props) {
  const me = useQuery({ ...meQuery, ...(who && { queryFn: who }), retry: false });
  const staff = isStaffRole(me.data?.role);
  const target = useQuery({
    queryKey: classroomKeys.staffLink(linkKey, me.data?.id ?? ''),
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
      <p role="status" className="text-sm text-ink-2">
        {t.classroom.joining}
      </p>
    </main>
  );
}
