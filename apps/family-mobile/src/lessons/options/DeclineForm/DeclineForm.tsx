import { declineLine } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, Button, ButtonRow, MoveReason, type, useTheme } from '@ab/mobile-kit';
import type { DeclineFormProps } from './DeclineForm.types';
import { useDeclineForm } from './use-decline-form';

/** Shows the late-cancel rule's effect on the package before confirming. */
export function DeclineForm({ lesson, title, busy, onDecline, onBack }: DeclineFormProps) {
  const { color } = useTheme();
  const { reason, setReason, A } = useDeclineForm();
  return (
    <View style={{ gap: 12 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {title}
      </AppText>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
        {A[declineLine(lesson)]}
      </AppText>
      <MoveReason value={reason} onChange={setReason} label={A.reasonLabel} hint={null} />
      <ButtonRow>
        <Button label={A.declineConfirm} onPress={() => onDecline(reason.trim())} disabled={busy} />
        <Button variant="ghost" label={A.back} onPress={onBack} />
      </ButtonRow>
    </View>
  );
}
