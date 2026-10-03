import { feedbackEligible, type LessonView } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { requestErrorText, requestFeedback } from './api';
import { FEEDBACK_TEMPLATE } from './types';

/** The students who may be asked: the lesson took place and they did not miss it (the API refuses the rest). */
export const askable = (lesson: Pick<LessonView, 'status' | 'students'>): LessonView['students'] =>
  lesson.students.filter((s) => feedbackEligible(lesson.status, s.attendance));

interface OneProps {
  lessonId: string;
  student: { id: string; name: string };
  /** Group lesson: say whose guardian gets it. */
  named: boolean;
  approved: boolean;
}

function OneButton({ lessonId, student, named, approved }: OneProps) {
  const send = useMutation({ mutationFn: requestFeedback });
  const sent = send.isSuccess;
  const label = named ? t.feedback.requestFor.replace('{name}', student.name) : t.feedback.sendRequest;
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="secondary"
        disabled={!approved || send.isPending || sent}
        className="justify-self-start"
        onClick={() => send.mutate({ lessonId, studentId: student.id })}
      >
        {send.isPending ? t.feedback.requestSending : sent ? t.feedback.requestSent : label}
      </Button>
      {sent && <p role="status" className="text-xs text-ink-2">{t.feedback.requestDone}</p>}
      {send.isError && <FormAlert>{requestErrorText(send.error)}</FormAlert>}
    </div>
  );
}

/**
 * «ابعت طلب الرأي» for a completed lesson (admin): one button per student, because each guardian
 * gets their own link. Disabled until WhatsApp approved the template; «اتبعت» once requested.
 */
export function FeedbackRequestButton({ lesson }: { lesson: LessonView }) {
  const students = askable(lesson);
  const eligible = students.length > 0;
  const templates = useQuery({ ...templatesQuery, enabled: eligible });
  if (!eligible) return null;
  const approved = templates.data?.some((x) => x.key === FEEDBACK_TEMPLATE && x.status === 'approved') ?? false;
  return (
    <div className="grid gap-2 border-t border-rule pt-3">
      {students.map((s) => (
        <OneButton key={s.id} lessonId={lesson.id} student={s} named={lesson.students.length > 1} approved={approved} />
      ))}
      {!approved && templates.isSuccess && (
        <p className="text-xs text-ink-3">
          {t.feedback.templateNotApproved}{' '}
          <a href="/admin/settings" className="font-semibold text-lapis underline underline-offset-4">
            {t.feedback.templateSettings}
          </a>
        </p>
      )}
    </div>
  );
}
