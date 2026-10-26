import { sessionWindowOpen, type ThreadLesson, type ThreadView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ClosedRow } from '../threads-list/ClosedRow';
import { ComposerNotes } from './ComposerNotes';
import { ErrorLine } from '../ErrorLine';
import { GateNote } from '../thread/components/GateNote';
import { OpenRow } from '../threads-list/OpenRow';
import { QuoteStrip } from '../messages/components/QuoteStrip';
import { SavedReplyChip } from '../saved-replies/SavedReplyChip';
import { SavedReplyPicker } from '../saved-replies/SavedReplyPicker';
import { SlashSuggestions } from '../saved-replies/SlashSuggestions';
import { useSavedReplyDraft } from '../saved-replies/use-saved-reply';
import { TemplatePicker } from './TemplatePicker';
import { useThreadMode } from '../thread/hooks/thread-mode';
import { errorLines, useComposerSend } from './use-composer-send';

/**
 * Reply box (R-MOB-02, R-MSG-03), one WhatsApp-like row: [template] [replies] [file] [text] [send]. Within
 * 24 h of their last message: free text, a photo or PDF, plus a template if wanted. After that WhatsApp allows only an
 * approved template, so the row says why (ClosedNote) beside «أرسل قالبًا». The window is checked
 * against the device clock on every render (a refetch, a keystroke), not only when the thread loaded.
 * «الردود السريعة» (owner 2026-10-25/26, staff only, as WhatsApp Business): «/» at a line's start docks
 * the list over the row, the button opens its sheet; a pick fills the box and stages its file (the
 * chip). «أرسل» sends the text, then the file.
 * «رد» (owner 2026-10-25): the quoted strip over the row; the text answers it (useComposerSend).
 */
export function Composer({
  phone,
  thread,
  lessons,
  student,
}: {
  phone: string;
  thread: ThreadView | null;
  lessons: ThreadLesson[];
  /** The family's first student: a saved reply's {student}. */
  student?: string | null;
}) {
  const staff = useThreadMode().kind !== 'teacher';
  const [text, setText] = useState('');
  const replies = useSavedReplyDraft({ text, setText, enabled: staff });
  const { sendTemplate, sendText, renew, errors, pending } = useComposerSend({ phone, text, setText, ...replies });
  const [picking, setPicking] = useState(false);
  // Why a photo / PDF did not go (AttachFile), until the next pick.
  const [fileError, setFileError] = useState<string | null>(null);
  const open = sessionWindowOpen(thread?.last_inbound_at ?? null, new Date());
  const pick = () => setPicking(true);
  const type = (v: string) => {
    replies.typed(v);
    setText(v);
    renew();
  };
  const lines = errorLines({ errors, fileError, open });

  return (
    <View style={{ gap: 4, paddingBottom: 8 }}>
      {lines.map((line) => (
        <ErrorLine key={line} message={line} />
      ))}
      <GateNote />
      <ComposerNotes thread={thread} open={open} />
      {open ? <QuoteStrip /> : null}
      {open && replies.staged ? <SavedReplyChip file={replies.staged.file} onRemove={replies.clearStaged} /> : null}
      {open && replies.search !== null ? (
        <SlashSuggestions search={replies.search} contact={{ thread, student }} onFill={replies.fill} />
      ) : null}
      {open ? (
        <OpenRow
          phone={phone}
          text={text}
          onText={type}
          onLeave={replies.dismiss}
          staff={staff}
          onTemplate={pick}
          onReplies={replies.open}
          onFileError={setFileError}
          onSend={sendText}
          sending={pending}
        />
      ) : (
        <ClosedRow known={thread !== null} staff={staff} onTemplate={pick} />
      )}
      {replies.sheet ? (
        <SavedReplyPicker
          contact={{ thread, student }}
          onClose={replies.close}
          onFill={replies.fill}
        />
      ) : null}
      <TemplatePicker
        visible={picking}
        lessons={lessons}
        contactName={thread?.display_name}
        teacher={!!thread?.teacher_id && !thread.guardian_id}
        onClose={() => setPicking(false)}
        onSend={(out) => {
          setPicking(false);
          sendTemplate(out);
        }}
      />
    </View>
  );
}
