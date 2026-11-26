import { useState } from 'react';
import { View } from 'react-native';
import { t, shape, useTheme, Button, Field, AppText, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';

interface UnpayConfirmProps {
  message: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Cancelling a payment needs a reason of three letters or more, which the API also checks. */
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
      <ButtonRow>
        <Button
          variant="danger"
          label={t.finance.unpay}
          busy={busy}
          onPress={() => {
            setTried(true);
            if (!short) onConfirm(reason.trim());
          }}
        />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
      </ButtonRow>
    </View>
  );
}
