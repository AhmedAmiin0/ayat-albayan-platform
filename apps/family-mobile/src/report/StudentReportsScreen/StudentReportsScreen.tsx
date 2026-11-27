import { EmptyState, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { OwnReports } from '@/report/OwnReports';
import { useStudentReportsScreen } from './use-student-reports-screen';

/** Newest first, by month; the tab shows only once the student is known. */
export function StudentReportsScreen() {
  const { me, pick, child, refresh, title } = useStudentReportsScreen();
  return (
    <FamilyPage header={<FamilyHeader title={title} child={child} />} onRefresh={refresh}>
      <LoadState query={me}>
        {() =>
          pick.state === 'one' ? (
            <OwnReports key={pick.student.id} student={pick.student} />
          ) : (
            <EmptyState title={t.portal.noStudents} />
          )
        }
      </LoadState>
    </FamilyPage>
  );
}
