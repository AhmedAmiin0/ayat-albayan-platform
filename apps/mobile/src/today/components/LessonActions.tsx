import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

export interface LessonActionsProps {
  /** This lesson's change is on its way. */
  busy: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canMove: boolean;
  onConfirm: () => void;
  /** Opens the cancel form on the card. */
  onCancel: () => void;
  /** Opens the reschedule sheet. */
  onReschedule: () => void;
  /** «عدّل الوقت» (R-SCH-11): the lesson allows an in-place edit. */
  canEditTime?: boolean;
  /** Opens the edit sheet. */
  onEditTime?: () => void;
}

/**
 * A Today card's actions (docs/07 §12): [إلغاء secondary][تأكيد primary] at 44pt, and «غيّر
 * الميعاد» and «عدّل الوقت» as quiet lapis actions under them. Only the ones the card allows show.
 */
export function LessonActions(p: LessonActionsProps) {
  if (!p.canConfirm && !p.canCancel && !p.canMove && !p.canEditTime) return null;
  return (
    <View style={{ gap: 4 }}>
      {p.canConfirm || p.canCancel ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {p.canCancel ? (
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={t.today.cancel} onPress={p.onCancel} busy={p.busy} />
            </View>
          ) : null}
          {p.canConfirm ? (
            <View style={{ flex: 1 }}>
              <Button label={t.today.confirm} onPress={p.onConfirm} busy={p.busy} />
            </View>
          ) : null}
        </View>
      ) : null}
      {p.canMove || p.canEditTime ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
          {p.canMove ? (
            <Button variant="ghost" label={t.lessons.rescheduleSubmit} onPress={p.onReschedule} busy={p.busy} />
          ) : null}
          {p.canEditTime ? (
            <Button variant="ghost" label={t.editTime.action} onPress={() => p.onEditTime?.()} busy={p.busy} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
