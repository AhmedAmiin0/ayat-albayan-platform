import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { lockedText, type PayoutLock } from './edit-time-lock';
import { lengthText } from './edit-time-text';

export interface PayoutLockNoticeProps {
  lock: PayoutLock;
  /** The recorded length: the one that can still be saved. */
  original: number;
  onRestore: () => void;
}

/**
 * 409 payout_locked: the month's payout is approved or paid, so this lesson's length is frozen.
 * Names the month and status, says a start-only correction is still fine, and puts the length back.
 */
export function PayoutLockNotice({ lock, original, onRestore }: PayoutLockNoticeProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8, padding: 14, borderRadius: shape.radius.md, backgroundColor: color.badSoft }}>
      <AppText accessibilityRole="alert" style={{ ...text, fontFamily: type.ui[600], color: color.bad }}>
        {lockedText(lock)}
      </AppText>
      <AppText style={text}>{t.editTime.startOnly}</AppText>
      <Button variant="secondary" label={t.editTime.restoreLength.replace('{len}', lengthText(original))} onPress={onRestore} />
    </View>
  );
}
