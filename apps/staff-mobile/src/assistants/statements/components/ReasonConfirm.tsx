import { useState } from 'react';
import { View } from 'react-native';
import { t, shape, useTheme, AppText, Button, Field, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';

interface ReasonConfirmProps {
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** The reason needs three letters or more; the API checks it too. */
export function ReasonConfirm({
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: ReasonConfirmProps) {
  const { color } = useTheme();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const short = reason.trim().length < 3;
  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.goldSoft,
        backgroundColor: color.goldWash,
      }}
    >
      <AppText style={{ color: color.ink }}>{message}</AppText>
      <Field
        label={t.finance.reason}
        value={reason}
        onChangeText={setReason}
        maxLength={500}
        required
      />
      {tried && short ? <ErrorLine message={t.assistants.error.reason_required} /> : null}
      <ButtonRow>
        <Button
          label={confirmLabel}
          busy={busy}
          onPress={() => {
            setTried(true);
            if (!short) onConfirm(reason.trim());
          }}
        />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} disabled={busy} />
      </ButtonRow>
    </View>
  );
}
