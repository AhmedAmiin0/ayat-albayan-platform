import { triesAfterWindow } from '@ab/client-core';
import type { ThreadLesson, ThreadView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/core/auth';
import { ClosedRow } from '@/inbox/threads-list/ClosedRow';
import { useComposerText, useForgetDraftOnLeave } from './draft-store';
import { QuoteSheet } from './quote/QuoteSheet';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { GateNote } from '@/inbox/thread/components/GateNote';
import { OpenRow } from '@/inbox/threads-list/OpenRow';
import { QuoteStrip } from '@/inbox/messages/components/QuoteStrip';
import { EditStrip } from './edit/EditStrip';
import { SavedReplyChip } from '@/inbox/saved-replies/components/SavedReplyChip';
import { SavedReplyPicker } from '@/inbox/saved-replies/components/SavedReplyPicker';
import { SlashSuggestions } from '@/inbox/saved-replies/quick-list/SlashSuggestions';
import { useSavedReplyDraft } from '@/inbox/saved-replies/hooks/use-saved-reply';
import { TemplatePicker } from './TemplatePicker';
import { ReopenSlot } from './reopen';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { sendState } from '@/inbox/thread/hooks/chat-window';
import { errorLines, useComposerSend } from './use-composer-send';

/**
 * Reply box (R-MOB-02, R-MSG-03) as WhatsApp Business (owner 2026-10-27): [pill: text · «عرض سعر» ·
 * paperclip] and the round microphone / «أرسل» (OpenRow); everything else is in the paperclip's sheet.
 * Within 24 h of their last message: free text, a photo or PDF, a voice note, plus a template (in the
 * paperclip's sheet). After it, on a Kapso chat line, staff still send all of it (owner 2026-11-01);
 * else only a template. The window is checked against the device clock on every render.
 * «الردود السريعة» (owner 2026-10-25/26, staff only, as WhatsApp Business): «/» at a line's start docks
 * the list over the row; a pick fills the box and stages its file. «أرسل» sends the text, then it.
 * «رد» (owner 2026-10-25): the quoted strip over the row; the text answers it (useComposerSend).
 * «تعديل» (2026-11-07): the edit bar instead; the text goes as a correction of that message.
 * A known chat after the window (owner 2026-11-14, «like Kapso»): the reopen bar (ReopenSlot) and
 * its sheet; under it the box on a Kapso line (held texts), else «أرسل قالبًا» (any template).
 * «عرض سعر» (owner 2026-10-26, staff with pricing.read): its sheet sends the offer or fills the box; the
 * box's text lives in draft-store for that.
 */
export function Composer({
  phone,
  thread,
  lessons,
  student,
  fresh = false,
}: {
  phone: string;
  thread: ThreadView | null;
  lessons: ThreadLesson[];
  /** The family's first student: a saved reply's {student}. */
  student?: string | null;
  /** No message yet (the server answered since the chat opened): the first one is a template. */
  fresh?: boolean;
}) {
  const staff = useThreadMode().kind !== 'teacher';
  const can = usePermissions();
  const quote = staff && can('pricing.read');
  const [quoting, setQuoting] = useState(false);
  const [text, setText] = useComposerText(phone);
  const replies = useSavedReplyDraft({ text, setText, enabled: staff });
  useForgetDraftOnLeave(phone, replies.staged ? text : null);
  const send = useComposerSend({ phone, text, setText, ...replies });
  const { sendTemplate, sendText, renew, errors, pending } = send;
  const [picking, setPicking] = useState(false);
  // A new chat opens on its allowed templates (owner 2026-11-06), until closed or one is sent.
  const [dismissed, setDismissed] = useState(false);
  const picker = picking || (fresh && staff && !dismissed);
  const closePicker = () => {
    setPicking(false);
    setDismissed(true);
  };
  // Why a photo / PDF did not go (AttachFile), until the next pick.
  const [fileError, setFileError] = useState<string | null>(null);
  const chat = sendState(thread, new Date());
  const open = chat.open;
  // Owner 2026-10-31 / 2026-11-01: a Kapso chat line still tries every staff send after the window.
  const trying = triesAfterWindow(chat, staff);
  const may = open || trying;
  const teacher = !!thread?.teacher_id && !thread.guardian_id;
  const pick = () => setPicking(true);
  const type = (v: string) => {
    replies.typed(v);
    setText(v);
    renew();
  };
  const lines = errorLines({ errors, fileError, open: may });

  return (
    <View style={{ gap: 4, paddingBottom: 8 }}>
      {lines.map((line) => (
        <ErrorLine key={line} message={line} />
      ))}
      <GateNote />
      <ReopenSlot
        {...{ phone, thread, lessons, teacher, open }}
        held={trying}
        onSend={sendTemplate}
      />
      {may ? <QuoteStrip /> : null}
      {may ? <EditStrip /> : null}
      {may && replies.staged ? <SavedReplyChip file={replies.staged.file} onRemove={replies.clearStaged} /> : null}
      {may && replies.search !== null ? (
        <SlashSuggestions search={replies.search} contact={{ thread, student }} onFill={replies.fill} />
      ) : null}
      {may ? (
        <OpenRow
          phone={phone}
          text={text}
          onText={type}
          onLeave={replies.dismiss}
          staff={staff && may}
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
          blocked={send.blocked}
        />
      ) : null}
      {!may ? (
        <ClosedRow known={thread !== null} staff={staff} onTemplate={pick} onQuote={quote ? () => setQuoting(true) : undefined} />
      ) : null}
      {replies.sheet ? (
        <SavedReplyPicker
          contact={{ thread, student }}
          onClose={replies.close}
          onFill={replies.fill}
        />
      ) : null}
      {quoting ? <QuoteSheet phone={phone} open={may} onClose={() => setQuoting(false)} /> : null}
      <TemplatePicker
        visible={picker}
        lessons={lessons}
        contactName={thread?.display_name}
        teacher={teacher}
        onClose={closePicker}
        onSend={(out) => {
          closePicker();
          sendTemplate(out);
        }}
      />
    </View>
  );
}
