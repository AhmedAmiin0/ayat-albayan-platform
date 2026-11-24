import { type MessageView, replyLesson, replyNote, type ReplyNote } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, locale, type, AppText, Button, useNow, useSmallText } from '@ab/mobile-kit';
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

/** R-SCH-03. */
export function ReplyNoteLine({ message: m }: { message: MessageView }) {
  const actions = useReplyActions();
  const small = useSmallText();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const now = useNow();
  const lesson = replyLesson(m, { lessons: actions.lessons, now });
  const note = replyNote(m, { lesson, rights: actions.rights, now, moved: actions.moved.includes(m.id), clock: { locale, cycle, tz } });
  if (!note) return null;
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      {note.key ? <AppText style={{ ...small, fontFamily: type.ui[600] }}>{fill(t.inbox.quickReply[note.key], note.when)}</AppText> : null}
      <Action message={m} note={note} />
    </View>
  );
}
