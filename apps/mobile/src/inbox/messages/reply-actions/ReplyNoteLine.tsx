import { type MessageView, replyLesson, replyNote, type ReplyNote } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { useNow } from '@/core/lib/time/use-now';
import { type } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useSmall } from '../components/MessageMeta';
import { useReplyActions } from './reply-actions-context';
import { ReplyConfirmButton } from './ReplyConfirmButton';

const fill = (text: string, when: string | null) => text.replace('{when}', when ?? '');

function Action({ message: m, note }: { message: MessageView; note: ReplyNote }) {
  const { phone, rights, openMove } = useReplyActions();
  const a = t.inbox.replyAction;
  if (!note.action) return null;
  const { kind, lesson } = note.action;
  if (kind === 'confirm') {
    return rights.confirm ? <ReplyConfirmButton phone={phone} lessonId={lesson.id} route={rights.confirm} label={fill(a.confirmLabel, note.when)} /> : null;
  }
  return <Button variant="secondary" label={a.reschedule} accessibilityLabel={fill(a.rescheduleLabel, note.when)} onPress={() => openMove(m.id, lesson)} />;
}

/**
 * Under a guardian's quick reply (R-SCH-03, owner 2026-10-28): what was done («تم تأكيد حلقة …»,
 * «تم تغيير موعد الحلقة») or what to do now, «تغيير الموعد» / «تأكيد الحلقة» for the lesson it refers
 * to (replyLesson), as a secondary button sized to its one-line label.
 */
export function ReplyNoteLine({ message: m }: { message: MessageView }) {
  const actions = useReplyActions();
  const small = useSmall();
  const cycle = useClockCycle();
  const now = useNow();
  const lesson = replyLesson(m, { lessons: actions.lessons, now });
  const note = replyNote(m, { lesson, rights: actions.rights, now, moved: actions.moved.includes(m.id), clock: { locale, cycle } });
  if (!note) return null;
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      {note.key ? <AppText style={{ ...small, fontFamily: type.ui[600] }}>{fill(t.inbox.quickReply[note.key], note.when)}</AppText> : null}
      <Action message={m} note={note} />
    </View>
  );
}
