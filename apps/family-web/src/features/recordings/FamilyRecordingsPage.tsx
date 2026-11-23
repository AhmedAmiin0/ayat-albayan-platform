import { Icon, Button } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { RecordingsPanel } from '@ab/web-kit/portal';
import { StudentOf } from './StudentOf';
import { useLessonNav } from './use-lesson-nav';

/**
 * `/recordings/<id>` (the app's «التسجيلات» screen): one child's recordings on a page of their
 * own, «التسجيلات» over the child's name, the same list and lesson card as the child's tab.
 */
export function FamilyRecordingsPage({ studentId }: { studentId: string }) {
  const nav = useLessonNav(studentId);
  return (
    <StudentOf studentId={studentId}>
      {(student) => (
        <section aria-labelledby="recordings-title" className="grid animate-fade-up gap-4">
          <Button type="button" variant="secondary" size="sm" className="justify-self-start"
            onClick={nav.back}>
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
