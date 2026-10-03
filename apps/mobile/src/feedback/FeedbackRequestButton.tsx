import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { canRequestFeedback, requestError } from './feedback-text';
import { useSendFeedbackRequest } from './queries';

const text = t.mobile.feedback;

function RequestFor({ lessonId, studentId, name, many }: { lessonId: string; studentId: string; name: string; many: boolean }) {
  const send = useSendFeedbackRequest(lessonId);
  return (
    <View style={{ gap: 2 }}>
      <Button
        variant="ghost"
        label={send.isSuccess ? text.sent : send.isPending ? text.sending : many ? text.sendFor.replace('{name}', name) : text.send}
        accessibilityLabel={text.sendFor.replace('{name}', name)}
        busy={send.isPending}
        disabled={send.isSuccess}
        onPress={() => send.mutate(studentId)}
      />
      {send.isError ? <ErrorLine message={requestError(send.error)} /> : null}
    </View>
  );
}

/**
 * «ابعت طلب الرأي» on a finished (مكتملة / متأخرة) lesson: one button per student, an explicit
 * admin send of the WhatsApp «رأيك يهمّنا» link to that student's guardian. «اتبعت» once queued;
 * the API's refusals (template not approved yet, already answered) show in words.
 */
export function FeedbackRequestButton({ lesson }: { lesson: LessonView }) {
  if (!canRequestFeedback(lesson.status)) return null;
  const many = lesson.students.length > 1;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
      {lesson.students.map((s) => (
        <RequestFor key={s.id} lessonId={lesson.id} studentId={s.id} name={s.name} many={many} />
      ))}
    </View>
  );
}
