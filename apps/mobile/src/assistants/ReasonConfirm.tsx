import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { shape, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';

export interface ReasonConfirmProps {
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** A confirm strip that needs a reason of three letters or more (void, un-pay; the API checks it too). */
export function ReasonConfirm({ message, confirmLabel, busy, onConfirm, onCancel }: ReasonConfirmProps) {
  const { color } = useTheme();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const short = reason.trim().length < 3;
  return (
    <View style={{ gap: 10, padding: 12, borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.goldSoft, backgroundColor: color.goldWash }}>
      <AppText style={{ color: color.ink }}>{message}</AppText>
      <Field label={t.finance.reason} value={reason} onChangeText={setReason} maxLength={500} required />
      {tried && short ? <ErrorLine message={t.assistants.error.reason_required} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" label={t.common.cancel} onPress={onCancel} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={confirmLabel}
            busy={busy}
            onPress={() => {
              setTried(true);
              if (!short) onConfirm(reason.trim());
            }}
          />
        </View>
      </View>
    </View>
  );
}
