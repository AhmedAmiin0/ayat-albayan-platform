import { sessionWindowOpen, type ThreadLesson, type ThreadView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth';
import { ClosedRow } from '@/inbox/threads-list/ClosedRow';
import { t } from '@/core/lib/i18n/i18n';
import { ClosedNote } from '@/inbox/thread/components/ClosedNote';
import { useComposerText, useForgetDraftOnLeave } from './draft-store';
import { QuoteSheet } from './quote/QuoteSheet';
import { ReopenNote } from './ReopenNote';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { GateNote } from '@/inbox/thread/components/GateNote';
import { OpenRow } from '@/inbox/threads-list/OpenRow';
import { QuoteStrip } from '@/inbox/messages/components/QuoteStrip';
import { SavedReplyChip } from '@/inbox/saved-replies/components/SavedReplyChip';
import { SavedReplyPicker } from '@/inbox/saved-replies/components/SavedReplyPicker';
import { SlashSuggestions } from '@/inbox/saved-replies/quick-list/SlashSuggestions';
import { useSavedReplyDraft } from '@/inbox/saved-replies/hooks/use-saved-reply';
import { TemplatePicker } from './TemplatePicker';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { errorLines, useComposerSend } from './use-composer-send';

/**
 * Reply box (R-MOB-02, R-MSG-03) as WhatsApp Business (owner 2026-10-27): [pill: text · «عرض سعر» ·
 * paperclip] and the round microphone / «أرسل» (OpenRow); everything else is in the paperclip's sheet.
 * Within 24 h of their last message: free text, a photo or PDF, a voice note, plus a template (in the
 * paperclip's sheet). After that WhatsApp allows only an approved template, so a full-width line says why (ClosedNote) over «أرسل قالبًا». The window is checked
 * against the device clock on every render (a refetch, a keystroke), not only when the thread loaded.
 * «الردود السريعة» (owner 2026-10-25/26, staff only, as WhatsApp Business): «/» at a line's start docks
 * the list over the row, its tile in the paperclip's sheet opens the sheet; a pick fills the box and stages its file (the
 * chip). «أرسل» sends the text, then the file.
 * «رد» (owner 2026-10-25): the quoted strip over the row; the text answers it (useComposerSend).
 * A closed chat, once opened, asks the server to reopen it (ReopenNote, owner 2026-10-26).
 * «عرض سعر» (owner 2026-10-26, staff with pricing.read): its sheet sends the offer or fills the box; the
 * box's text lives in draft-store for that.
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
  const can = usePermissions();
  const quote = staff && can('pricing.read');
  const [quoting, setQuoting] = useState(false);
  const [text, setText] = useComposerText(phone);
  const replies = useSavedReplyDraft({ text, setText, enabled: staff });
  useForgetDraftOnLeave(phone, replies.staged !== null);
  const { sendTemplate, sendText, renew, errors, pending } = useComposerSend({ phone, text, setText, ...replies });
  const [picking, setPicking] = useState(false);
  // Why a photo / PDF did not go (AttachFile), until the next pick.
  const [fileError, setFileError] = useState<string | null>(null);
  const open = sessionWindowOpen(thread?.last_inbound_at ?? null, new Date());
  // Owner 2026-10-31: a Kapso chat line still tries staff's free text after the window (no files).
  const trying = !open && staff && thread?.try_after_window === true;
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
      <ReopenNote phone={phone} closed={thread !== null && !open} />
      {trying ? <ClosedNote known note={t.inbox.tryAfterWindow} /> : null}
      {open ? <QuoteStrip /> : null}
      {open && replies.staged ? <SavedReplyChip file={replies.staged.file} onRemove={replies.clearStaged} /> : null}
      {open && replies.search !== null ? (
        <SlashSuggestions search={replies.search} contact={{ thread, student }} onFill={replies.fill} />
      ) : null}
      {open || trying ? (
        <OpenRow
          phone={phone}
          text={text}
          onText={type}
          onLeave={replies.dismiss}
          staff={staff && open}
          onTemplate={pick}
          quietTemplate={trying}
          onReplies={replies.open}
          onFileError={setFileError}
          onQuote={quote ? () => setQuoting(true) : undefined}
          onSend={() => {
            replies.dismiss();
            sendText();
          }}
          staged={replies.staged !== null}
          sending={pending}
        />
      ) : (
        <ClosedRow known={thread !== null} staff={staff} onTemplate={pick} onQuote={quote ? () => setQuoting(true) : undefined} />
      )}
      {replies.sheet ? (
        <SavedReplyPicker
          contact={{ thread, student }}
          onClose={replies.close}
          onFill={replies.fill}
        />
      ) : null}
      {quoting ? <QuoteSheet phone={phone} open={open} onClose={() => setQuoting(false)} /> : null}
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
