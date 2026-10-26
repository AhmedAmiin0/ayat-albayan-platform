import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { lessonErrorText } from '@/features/teaching/schedule/api';
import { t } from '@/lib/i18n/i18n';
import { courseChangeViewQuery } from './api';
import { CourseChangeForm } from './CourseChangeForm';

export interface AdminCourseChangeProps {
  /** The lesson's course (LessonView.course_subscription_id). */
  subscriptionId: string;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** The admin's «تغيير أيام الحلقات» from a lesson's drawer: GET /booking/course/change, then the form. */
export function AdminCourseChange({ subscriptionId, onBack, onDone }: AdminCourseChangeProps) {
  const view = useQuery(courseChangeViewQuery(subscriptionId));
  return (
    <section aria-label={t.booking.courseChange.changeDays} className="grid gap-4">
      <h3 className="font-display text-h4 font-bold">{t.booking.courseChange.changeDays}</h3>
      {view.data && <CourseChangeForm view={view.data} onBack={onBack} onDone={onDone} />}
      {view.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {view.isError && (
        <>
          <FormAlert>{lessonErrorText(view.error)}</FormAlert>
          <Button type="button" variant="ghost" className="justify-self-end" onClick={onBack}>
            {t.lessons.back}
          </Button>
        </>
      )}
    </section>
  );
}
