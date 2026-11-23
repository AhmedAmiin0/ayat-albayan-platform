import type { ProfileCourseView } from '@ab/shared';
import type { BookingTeacherOption } from '@ab/schedule';
import { useState } from 'react';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import {
  ChangeReview,
  changeBody,
  CourseChangeForm,
  currentPicks,
} from '@/features/teaching/booking';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fromNextLesson } from './ChangeTimesDialog';
import type { TeacherDraft } from './TeacherPickStep';

export interface TeacherMoveProps {
  view: ProfileCourseView;
  teacher: BookingTeacherOption;
  draft: TeacherDraft;
  onBack: () => void;
  onDone: () => void;
}

/**
 * «تغيير المعلم», step 2: the same days and times from «من تاريخ» straight to the review, or the
 * course-days picker on the new teacher's free slots, under «المعلم الجديد: …» (owner
 * 2026-11-17). One idempotency key per step (rule 8).
 */
export function TeacherMove(props: TeacherMoveProps) {
  const { teacher } = props;
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-ink">
        {t.courseActions.teacher.reviewNew.replace('{name}', teacher.display_name_ar)}
      </p>
      <TeacherMoveStep {...props} />
    </div>
  );
}

/** The days picker (new days) or straight to the review (the same days). */
function TeacherMoveStep({ view, teacher, draft, onBack, onDone }: TeacherMoveProps) {
  const [requestId] = useState(() => crypto.randomUUID());
  const moved = fromNextLesson(view, draft.from);
  const course = { ...moved.course, teacherId: teacher.id, teacherTz: teacher.tz };
  if (!draft.keep) {
    return (
      <CourseChangeForm
        key={teacher.id}
        view={{ ...moved, course }}
        onBack={onBack}
        onDone={onDone}
      />
    );
  }
  const prefilled = currentPicks(course, new Date());
  const picks = prefilled.map((p) => p.at);
  const body = changeBody({ course, picks, prefilled, requestId });
  if (!body) return <FormAlert>{t.courseActions.errors.no_occurrences}</FormAlert>;
  return <ChangeReview body={body} course={course} onChangeSlot={onBack} onDone={onDone} />;
}
