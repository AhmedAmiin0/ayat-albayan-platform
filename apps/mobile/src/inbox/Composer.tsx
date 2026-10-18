import { sessionWindowOpen, type ThreadLesson, type ThreadView } from '@ab/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { requestId } from '@/lib/request-id';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { TemplateIcon, SendIcon } from './chat-icons';
import { ClosedNote } from './ClosedNote';
import { ComposerInput } from './ComposerInput';
import { ComposerNotes } from './ComposerNotes';
import { ErrorLine } from './ErrorLine';
import { GateNote } from './GateNote';
import { sendError } from './message-text';
import { TemplatePicker } from './TemplatePicker';
import { type Outgoing, useSendMessage } from './use-thread';

/** One template draft = one key + params: re-sending it after an error keeps its clientRequestId. */
const draftOf = (out: Outgoing): string =>
  out.kind === 'template' ? JSON.stringify([out.key, out.params, out.lessonId]) : '';

/**
 * Reply box (R-MOB-02, R-MSG-03), one WhatsApp-like row: [template] [text] [send]. Within 24 h of
 * their last message: free text, plus a template if wanted. After that WhatsApp allows only an
 * approved template, so the row says why (ClosedNote) beside «أرسل قالبًا». The window is checked
 * against the device clock on every render (a refetch, a keystroke), not only when the thread loaded.
 */
export function Composer({
  phone,
  thread,
  lessons,
}: {
  phone: string;
  thread: ThreadView | null;
  lessons: ThreadLesson[];
}) {
  const { color } = useTheme();
  const send = useSendMessage(phone);
  const [text, setText] = useState('');
  // clientRequestId: kept while the same text is retried, so a lost answer never sends twice.
  const [draftId, setDraftId] = useState(requestId);
  // The same for a template: the same template + params sent again (after «جرّب تاني») reuses its id.
  const templateDraft = useRef<{ draft: string; id: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const open = sessionWindowOpen(thread?.last_inbound_at ?? null, new Date());
  const pick = () => setPicking(true);

  const sendText = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(
      { out: { kind: 'text', text: body }, id: draftId },
      {
        onSuccess: () => setDraftId(requestId()),
        onError: () => setText((now) => now || body),
      },
    );
  };

  return (
    <View style={{ gap: 4, paddingBottom: 8 }}>
      {send.isError ? <ErrorLine message={sendError(send.error)} /> : null}
      <GateNote />
      <ComposerNotes thread={thread} open={open} />
      {open ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <IconButton label={t.inbox.composer.sendTemplate} onPress={pick}>
            <TemplateIcon color={color.lapis} />
          </IconButton>
          <ComposerInput
            value={text}
            onChange={(v) => {
              setText(v);
              setDraftId(requestId());
            }}
          />
          <IconButton variant="filled" label={t.inbox.composer.send} onPress={sendText}>
            <SendIcon color={color.onLapis} />
          </IconButton>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ClosedNote known={thread !== null} />
          <Button label={t.inbox.composer.sendTemplate} onPress={pick} />
        </View>
      )}
      <TemplatePicker
        visible={picking}
        lessons={lessons}
        teacher={!!thread?.teacher_id && !thread.guardian_id}
        onClose={() => setPicking(false)}
        onSend={(out) => {
          setPicking(false);
          const draft = draftOf(out);
          const last = templateDraft.current;
          const id = last?.draft === draft ? last.id : requestId();
          templateDraft.current = { draft, id };
          send.mutate({ out, id }, { onSuccess: () => (templateDraft.current = null) });
        }}
      />
    </View>
  );
}
