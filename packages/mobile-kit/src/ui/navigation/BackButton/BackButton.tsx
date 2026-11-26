import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { Chevron } from '../../primitives/Chevron';
import { IconButton } from '../../primitives/IconButton';

interface BackButtonProps {
  onPress: () => void;
  /** Work in flight (a wizard booking): not pressable until it settles. */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** Chevron points to the inline-start; named back for screen readers. */
export function BackButton({ onPress, busy = false, disabled = false, testID }: BackButtonProps) {
  const { color } = useTheme();
  return (
    <IconButton label={t.common.back} onPress={onPress} disabled={busy || disabled} testID={testID}>
      <Chevron to="prev" color={color.ink} size={22} />
    </IconButton>
  );
}
