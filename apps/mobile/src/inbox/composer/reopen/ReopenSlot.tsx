import type { ThreadLesson, ThreadView } from '@ab/shared';
import { TemplatePicker } from '@/inbox/composer/TemplatePicker';
import type { Outgoing } from '@/inbox/thread/hooks/use-thread';
import { ReopenBar } from './ReopenBar';
import { useReopenBar } from './use-reopen-bar';

interface ReopenSlotProps {
  phone: string;
  thread: ThreadView | null;
  lessons: readonly ThreadLesson[];
  /** A teacher's thread: only teacher templates. */
  teacher: boolean;
  /** The 24 h window is open (sendState). */
  open: boolean;
  /** Staff may still type after the window (a Kapso chat line): texts are held. */
  held: boolean;
  /** The picked template, sent as this phone's reopen (reopen: true). */
  onSend: (out: Outgoing) => void;
}

/** The sheet's template, marked as the reopen. */
const asReopen = (out: Outgoing): Outgoing =>
  out.kind === 'template' ? { ...out, reopen: true } : out;

/**
 * «إعادة فتح المحادثة» (owner 2026-11-14, «like Kapso»): the bar of a known chat whose window
 * closed, and its template sheet (chat-line templates this user may send, opened on the
 * academy's `chat_reopen_template`, prefilled and editable, with the preview).
 */
export function ReopenSlot(props: ReopenSlotProps) {
  const { phone, thread, open, teacher } = props;
  const state = useReopenBar({ phone, thread, open, teacher });
  const bar = state.bar === 'open' ? null : state.bar;
  const close = () => state.setPicking(false);
  return (
    <>
      {bar ? (
        <ReopenBar
          bar={bar}
          tick={state.tick}
          held={props.held}
          canReopen={state.canReopen}
          onReopen={() => state.setPicking(true)}
        />
      ) : null}
      {state.picking ? (
        <TemplatePicker
          visible
          reopen={{ preferred: thread?.reopen_template }}
          lessons={props.lessons}
          contactName={thread?.display_name}
          teacher={teacher}
          onClose={close}
          onSend={(out) => {
            close();
            props.onSend(asReopen(out));
          }}
        />
      ) : null}
    </>
  );
}
