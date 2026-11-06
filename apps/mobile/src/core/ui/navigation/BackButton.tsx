import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { IconButton } from '@/core/ui/primitives/IconButton';

interface BackButtonProps {
  onPress: () => void;
  /** Work in flight (a wizard booking): not pressable until it settles. */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * A screen's «رجوع» as an icon (owner 2026-11-06: «Make the back button an icon»): the 44pt
 * IconButton with a chevron pointing to the inline-start (right in Arabic, left in English), named
 * «رجوع» for screen readers. ScreenHeader's `leading` puts it before the title.
 */
export function BackButton({ onPress, busy = false, disabled = false, testID }: BackButtonProps) {
  const { color } = useTheme();
  return (
    <IconButton label={t.common.back} onPress={onPress} disabled={busy || disabled} testID={testID}>
      <Chevron to="prev" color={color.ink} size={22} />
    </IconButton>
  );
}
