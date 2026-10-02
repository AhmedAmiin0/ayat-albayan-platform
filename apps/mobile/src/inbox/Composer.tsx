import { sessionWindowOpen, type ThreadView, WA_TEXT_MAX } from '@ab/shared';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/lib/i18n';
import { requestId } from '@/lib/request-id';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ErrorLine } from './ErrorLine';
import { sendError, sessionUntil } from './message-text';
import { TemplatePicker } from './TemplatePicker';
import { useSendMessage } from './use-thread';

/**
 * Reply box (R-MOB-02, R-MSG-03). Within 24 h of their last message: free text, plus a template if
 * wanted. After that WhatsApp allows only an approved template, so the box says why
 * (inbox.sessionClosed, verbatim) and offers the template sheet. The window is checked against the
 * device clock on every render (a refetch, a keystroke), not only when the thread loaded.
 */
export function Composer({ phone, thread }: { phone: string; thread: ThreadView | null }) {
  const { color } = useTheme();
  const send = useSendMessage(phone);
  const [text, setText] = useState('');
  // clientRequestId: kept while the same text is retried, so a lost answer never sends twice.
  const [draftId, setDraftId] = useState(requestId);
  const [picking, setPicking] = useState(false);
  const lastInbound = thread?.last_inbound_at ?? null;
  const open = sessionWindowOpen(lastInbound, new Date());
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
  };
  // H3/H4 answer `queued` with no error only when sending is switched off (docs/12 §3.1).
  const parked = send.data?.status === 'queued' && !send.data.error_code;

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
      {parked && !send.isPending ? <AppText style={note}>{t.inbox.messagingOff}</AppText> : null}
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
            {t.inbox.sessionClosed}
          </AppText>
          <Button label={t.inbox.composer.sendTemplate} onPress={() => setPicking(true)} />
        </>
      )}
      <TemplatePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onSend={(out) => {
          setPicking(false);
          send.mutate({ out, id: requestId() });
        }}
      />
    </View>
  );
}
