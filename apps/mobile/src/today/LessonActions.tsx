import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';

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
}

/**
 * A Today card's actions (docs/07 §12): [إلغاء secondary][تأكيد primary] at 44pt, and «غيّر
 * الميعاد» as a quiet lapis action under them. Only the ones the card allows show.
 */
export function LessonActions(p: LessonActionsProps) {
  if (!p.canConfirm && !p.canCancel && !p.canMove) return null;
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
      {p.canMove ? (
        <Button variant="ghost" label={t.lessons.rescheduleSubmit} onPress={p.onReschedule} busy={p.busy} />
      ) : null}
    </View>
  );
}
