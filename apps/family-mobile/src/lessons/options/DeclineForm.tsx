import { declineLine } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, ButtonRow, MoveReason, t, type, useTheme } from '@ab/mobile-kit';

interface DeclineFormProps {
  lesson: PortalLesson;
  busy: boolean;
  onDecline: (reason: string) => void;
  onBack: () => void;
}

/**
 * «الاعتذار عن الحلقة» (canvas LessonXDecline): what it does to the package (the late cancel
 * rule's preview), the optional reason, then «تأكيد الاعتذار» or «تراجع».
 */
export function DeclineForm({ lesson, busy, onDecline, onBack }: DeclineFormProps) {
  const { color } = useTheme();
  const [reason, setReason] = useState('');
  const A = t.portal.actions;
  return (
    <View style={{ gap: 12 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {A.declineTitle}
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
