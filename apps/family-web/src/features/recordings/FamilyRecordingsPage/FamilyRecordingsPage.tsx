import { Icon, Button, t, PortalRecordingsPanel as RecordingsPanel } from '@ab/web-kit';
import { StudentOf } from '@/features/recordings/StudentOf';
import type { FamilyRecordingsPageProps } from './FamilyRecordingsPage.types';
import { useFamilyRecordingsPage } from './use-family-recordings-page';

export function FamilyRecordingsPage({ studentId }: FamilyRecordingsPageProps) {
  const { nav } = useFamilyRecordingsPage({ studentId });
  return (
    <StudentOf studentId={studentId}>
      {(student) => (
        <section aria-labelledby="recordings-title" className="grid animate-fade-up gap-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="justify-self-start"
            onClick={nav.back}
          >
            <Icon name="chevron-right" />
            {t.common.back}
          </Button>
          <div className="grid gap-0.5">
            <h1 id="recordings-title" className="font-display text-h2 font-bold">
              {t.lessonFiles.recordings}
            </h1>
            <p className="text-sm text-ink-3">{student.name}</p>
          </div>
          <RecordingsPanel student={student} onOpenReport={nav.openReport} />
        </section>
      )}
    </StudentOf>
  );
}
