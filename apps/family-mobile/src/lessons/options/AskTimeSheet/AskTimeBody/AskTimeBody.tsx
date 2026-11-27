import { View } from 'react-native';
import {
  AppText,
  Button,
  ErrorLine,
  MoveReason,
  Note,
  SlotPicker,
  t,
  type,
  useTheme,
} from '@ab/mobile-kit';
import type { AskTimeBodyProps } from './AskTimeBody.types';
import { useAskTimeBody } from './use-ask-time-body';

export function AskTimeBody({ lesson, student, busy, error, onSend }: AskTimeBodyProps) {
  const { color } = useTheme();
  const ask = useAskTimeBody({ lesson, student, onSend });
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[700], color: color.ink }}>{student.name}</AppText>
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{ask.current}</AppText>
      </View>
      <SlotPicker
        week={ask.week}
        slots={ask.slots}
        tz={student.tz}
        viewer={ask.viewer}
        value={ask.startsAt}
        onPick={ask.setStartsAt}
      />
      <MoveReason
        value={ask.note}
        onChange={ask.setNote}
        label={t.portal.actions.noteLabel}
        hint={null}
      />
      <Note>{t.portal.actions.staysNote}</Note>
      {error ? <ErrorLine message={error} /> : null}
      <Button
        label={t.portal.actions.send}
        onPress={ask.send}
        disabled={busy || ask.startsAt === null}
      />
    </View>
  );
}
