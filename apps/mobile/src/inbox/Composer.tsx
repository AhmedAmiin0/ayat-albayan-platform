import { sessionWindowOpen, type ThreadLesson, type ThreadView, WA_TEXT_MAX } from '@ab/shared';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/lib/i18n';
import { requestId } from '@/lib/request-id';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ErrorLine } from './ErrorLine';
import { GateNote } from './GateNote';
import { LineNote } from './LineNote';
import { sendError, sessionUntil } from './message-text';
import { TemplatePicker } from './TemplatePicker';
import { type Outgoing, useSendMessage } from './use-thread';

/** One template draft = one key + params: re-sending it after an error keeps its clientRequestId. */
const draftOf = (out: Outgoing): string => (out.kind === 'template' ? JSON.stringify([out.key, out.params, out.lessonId]) : '');

/**
 * Reply box (R-MOB-02, R-MSG-03). Within 24 h of their last message: free text, plus a template if
 * wanted. After that WhatsApp allows only an approved template, so the box says why
 * (inbox.sessionClosed, verbatim; a number with no message yet says the first message is a template)
 * and offers the template sheet. The window is checked against the
 * device clock on every render (a refetch, a keystroke), not only when the thread loaded.
 */
export function Composer({ phone, thread, lessons }: { phone: string; thread: ThreadView | null; lessons: ThreadLesson[] }) {
  const { color } = useTheme();
  const send = useSendMessage(phone);
  const [text, setText] = useState('');
  // clientRequestId: kept while the same text is retried, so a lost answer never sends twice.
  const [draftId, setDraftId] = useState(requestId);
  // The same for a template: the same template + params sent again (after «جرّب تاني») reuses its id.
  const templateDraft = useRef<{ draft: string; id: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const lastInbound = thread?.last_inbound_at ?? null;
  const open = sessionWindowOpen(lastInbound, new Date());
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
  };

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
    <View style={{ gap: 8, paddingBottom: 12 }}>
      {send.isError ? <ErrorLine message={sendError(send.error)} /> : null}
      <GateNote />
      <LineNote thread={thread} open={open} />
      {open ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              multiline
              value={text}
              maxLength={WA_TEXT_MAX}
              onChangeText={(v) => {
                setText(v);
                setDraftId(requestId());
              }}
              accessibilityLabel={t.inbox.composer.placeholder}
              placeholder={t.inbox.composer.placeholder}
              placeholderTextColor={color.ink3}
              style={{
                flex: 1,
                minHeight: shape.control.touch,
                maxHeight: 140,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: color.ruleInput,
                borderRadius: shape.radius.md,
                backgroundColor: color.raised,
                color: color.ink,
                fontFamily: type.ui[400],
                fontSize: type.size.base,
                textAlign: 'left',
              }}
            />
            <Button label={t.inbox.composer.send} onPress={sendText} />
          </View>
          {lastInbound ? <AppText style={note}>{sessionUntil(lastInbound)}</AppText> : null}
          <Button variant="ghost" label={t.inbox.composer.sendTemplate} onPress={() => setPicking(true)} />
        </>
      ) : (
        <>
          <AppText
            style={{
              ...note,
              padding: 12,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: color.goldSoft,
              backgroundColor: color.goldWash,
              color: color.ink,
            }}
          >
            {thread ? t.inbox.sessionClosed : t.inbox.newChat.firstTemplate}
          </AppText>
          <Button label={t.inbox.composer.sendTemplate} onPress={() => setPicking(true)} />
        </>
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
