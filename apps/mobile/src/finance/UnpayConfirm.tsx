import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { AppText } from '@/core/ui/primitives/AppText';

export interface UnpayConfirmProps {
  message: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** «إلغاء الدفع» needs a reason of three letters or more (the API checks it too); the strip keeps what was typed. */
export function UnpayConfirm({ message, busy, onConfirm, onCancel }: UnpayConfirmProps) {
  const { color } = useTheme();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const short = reason.trim().length < 3;
  return (
    <View style={{ gap: 10, padding: 12, borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.goldSoft, backgroundColor: color.goldWash }}>
      <AppText style={{ color: color.ink }}>{message}</AppText>
      <Field label={t.finance.reason} value={reason} onChangeText={setReason} maxLength={500} required />
      {tried && short ? <ErrorLine message={t.finance.reasonRequired} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" label={t.common.cancel} onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t.finance.unpay}
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
