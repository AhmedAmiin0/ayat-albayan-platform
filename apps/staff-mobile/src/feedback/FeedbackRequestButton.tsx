import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { useApprovedTemplates } from '@/inbox/composer/TemplatePicker';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { askable, requestError } from './feedback-text';
import { useSendFeedbackRequest } from './queries';

const text = t.mobile.feedback;

interface RequestForProps {
  lessonId: string;
  studentId: string;
  name: string;
  many: boolean;
  approved: boolean;
}

function RequestFor({ lessonId, studentId, name, many, approved }: RequestForProps) {
  const send = useSendFeedbackRequest(lessonId);
  return (
    <View style={{ gap: 2 }}>
      <Button
        variant="secondary"
        label={send.isSuccess ? text.sent : send.isPending ? text.sending : many ? text.sendFor.replace('{name}', name) : text.send}
        accessibilityLabel={text.sendFor.replace('{name}', name)}
        busy={send.isPending}
        disabled={send.isSuccess || !approved}
        onPress={() => send.mutate(studentId)}
      />
      {send.isError ? <ErrorLine message={requestError(send.error)} /> : null}
    </View>
  );
}

/**
 * The feedback-request button on a finished (completed / late) lesson: one outlined full-width
 * button per student (docs/07 §6: never a shrink-wrapped row), an explicit admin send of the
 * WhatsApp feedback link to that student's guardian (not to one who missed the lesson). Off, with
 * the reason, until WhatsApp approved the template; a sent note once queued; the API's refusals
 * (already answered) show in words.
 */
export function FeedbackRequestButton({ lesson }: { lesson: LessonView }) {
  const students = askable(lesson);
  if (students.length === 0) return null;
  return <Requests lesson={lesson} students={students} />;
}

function Requests({ lesson, students }: { lesson: LessonView; students: LessonView['students'] }) {
  const templates = useApprovedTemplates(true);
  const approved = templates.data?.some((row) => row.key === 'lesson_feedback_request') ?? false;
  const many = lesson.students.length > 1;
  return (
    <View style={{ gap: 8 }}>
      {students.map((s) => (
        <RequestFor
          key={s.id}
          lessonId={lesson.id}
          studentId={s.id}
          name={s.name}
          many={many}
          approved={approved}
        />
      ))}
      {!approved && templates.isSuccess ? <Note>{t.feedback.templateNotApproved}</Note> : null}
    </View>
  );
}
