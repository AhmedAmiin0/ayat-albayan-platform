import { isOpenLesson, type LessonView } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { templatesQuery } from '@/features/messaging/templates/api';
import { t } from '@/lib/i18n/i18n';
import { sendJoinLink } from '../api/api';
import { classroomErrorText } from '../room/livekit/errors';

const TEMPLATE = 'lesson_join_link';

interface OneProps {
  lessonId: string;
  student: { id: string; name: string };
  named: boolean;
  approved: boolean;
}

function OneLinkButton({ lessonId, student, named, approved }: OneProps) {
  const send = useMutation({ mutationFn: sendJoinLink });
  const label = named ? `${t.classroom.sendLink} ${t.classroom.sendLinkTo.replace('{name}', student.name)}` : t.classroom.sendLink;
  const done = send.data ? (send.data.replayed ? t.classroom.linkResent : t.classroom.linkSent) : null;
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="secondary"
        disabled={!approved || send.isPending || send.isSuccess}
        className="justify-self-start"
        onClick={() => send.mutate({ lessonId, studentId: student.id })}
      >
        {send.isPending ? t.classroom.sendingLink : (done ?? label)}
      </Button>
      {done && <p role="status" className="text-xs text-ink-2">{done}</p>}
      {send.isError && <FormAlert>{classroomErrorText(send.error)}</FormAlert>}
    </div>
  );
}

/** «ابعت لينك الحلقة» (admin): one button per student, since each family gets its own link. */
export function SendLinkButton({ lesson }: { lesson: LessonView }) {
  const eligible = isOpenLesson(lesson.status) && lesson.students.length > 0;
  const templates = useQuery({ ...templatesQuery, enabled: eligible });
  if (!eligible) return null;
  const approved = templates.data?.some((x) => x.key === TEMPLATE && x.status === 'approved') ?? false;
  return (
    <div className="grid gap-2 border-t border-rule pt-3">
      {lesson.students.map((s) => (
        <OneLinkButton key={s.id} lessonId={lesson.id} student={s} named={lesson.students.length > 1} approved={approved} />
      ))}
      {!approved && templates.isSuccess && (
        <p className="text-xs text-ink-3">
          {t.classroom.error.template_not_approved}{' '}
          <a href="/admin/settings/communications?tab=templates" className="font-semibold text-lapis underline underline-offset-4">
            {t.feedback.templateSettings}
          </a>
        </p>
      )}
    </div>
  );
}
