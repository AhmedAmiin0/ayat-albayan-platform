import { replyLesson, replyNote, type MessageView, type ReplyNote } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { useReplyActions } from './reply-actions-context';
import { ReplyConfirmButton } from './ReplyConfirmButton';

const fill = (text: string, when: string | null) => text.replace('{when}', when ?? '');

function ActionButton({ message: m, note }: { message: MessageView; note: ReplyNote }) {
  const actions = useReplyActions();
  const { action } = note;
  if (!action) return null;
  const a = t.inbox.replyAction;
  if (action.kind === 'confirm') {
    if (!actions.rights.confirm) return null;
    return (
      <ReplyConfirmButton
        phone={actions.phone}
        lessonId={action.lesson.id}
        route={actions.rights.confirm}
        label={fill(a.confirmLabel, note.when)}
      />
    );
  }
  const label = fill(a.rescheduleLabel, note.when);
  return (
    <Button type="button" size="sm" variant="secondary" aria-label={label} title={label} onClick={() => actions.reschedule(m.id, action.lesson)}>
      {a.reschedule}
    </Button>
  );
}

export function ReplyNoteLine({ message: m }: { message: MessageView }) {
  const actions = useReplyActions();
  // The lesson's time in the viewer's zone (docs/34), not the academy's default.
  const clock = { ...useClock(), tz: useViewerTz() };
  const now = useNow();
  const lesson = replyLesson(m, { lessons: actions.lessons, now });
  const note = replyNote(m, {
    lesson,
    rights: actions.rights,
    now,
    moved: actions.moved.includes(m.id),
    clock,
  });
  if (!note) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {note.key && <p className="text-xs font-semibold text-ink-2">{fill(t.inbox.quickReply[note.key], note.when)}</p>}
      <ActionButton message={m} note={note} />
    </div>
  );
}
