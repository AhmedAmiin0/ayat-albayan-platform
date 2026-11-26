import { FamilyHeader, FamilyPage } from '@/nav';
import { LoadState } from '@/ui';
import { LessonBody } from '@/recordings/LessonBody';
import { useLessonScreen } from './use-lesson-screen';

/** Recording, report and staff files show only once the report was sent. */
export function LessonScreen() {
  const { params, page, title, subtitle } = useLessonScreen();
  return (
    <FamilyPage
      header={<FamilyHeader title={title} subtitle={subtitle} back />}
      onRefresh={() => page.refetch()}
    >
      <LoadState query={page}>
        {(data) => <LessonBody view={data} studentId={params.student} />}
      </LoadState>
    </FamilyPage>
  );
}
