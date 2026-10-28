import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';

interface QuoteActionsProps {
  /** The 24 h window: outside it only «انسخ» works. */
  open: boolean;
  /** No quote yet, or the previous choice's: nothing may leave. */
  ready: boolean;
  sending: boolean;
  onSend: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

/** «أرسل العرض» (the one filled button, alone), then ONE ButtonRow «عدّل قبل الإرسال» | «انسخ» (docs/07 «الأزرار»). */
export function QuoteActions(p: QuoteActionsProps) {
  const off = !p.open || !p.ready;
  return (
    <View style={{ gap: 8 }}>
      <Button
        label={p.sending ? t.inbox.composer.sending : t.inbox.quote.send}
        busy={p.sending}
        disabled={off}
        onPress={p.onSend}
      />
      <ButtonRow>
        <Button variant="secondary" label={t.inbox.quote.edit} disabled={off || p.sending} onPress={p.onEdit} />
        <Button variant="secondary" label={t.inbox.quote.copy} disabled={!p.ready} onPress={p.onCopy} />
      </ButtonRow>
    </View>
  );
}
