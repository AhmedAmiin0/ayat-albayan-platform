import type { PortalHome as Home } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { MeTestChip } from '@/features/people/test-accounts';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalHomeQuery } from '@ab/web-kit/portal/api';
import { ChildView } from '@/features/people/portal/child/ChildView';
import { GuardianHome } from '@/features/people/portal/home/GuardianHome';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';

/** A student's own login lands on their own screen; a guardian on every child, then one. */
function Landing({ home }: { home: Home }) {
  const [picked, setPicked] = useState<string | null>(null);
  const student = home.students.find((s) => s.id === picked);
  if (home.kind === 'student' && home.students[0]) {
    return <ChildView kind="student" student={home.students[0]} />;
  }
  if (student) {
    return (
      <ChildView key={student.id} kind={home.kind} student={student} onBack={() => setPicked(null)} />
    );
  }
  return <GuardianHome home={home} onOpen={setPicked} />;
}

/**
 * /portal (docs/31, docs/50 §6), phone first. Every read is the API's whitelist for the login's
 * own students, re-read when the family comes back to the page.
 */
export function PortalHome() {
  const query = useQuery(portalHomeQuery);
  return (
    <div className="mx-auto grid w-full max-w-[640px] gap-5">
      <div className="empty:hidden">
        <MeTestChip />
      </div>
      <QueryState query={query}>
        {(home) =>
          home.students.length === 0 ? (
            <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>
          ) : (
            <Landing home={home} />
          )
        }
      </QueryState>
    </div>
  );
}
