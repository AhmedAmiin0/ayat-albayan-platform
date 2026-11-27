import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { Chevron } from '../../primitives/Chevron';
import { IconButton } from '../../primitives/IconButton';
import type { BackButtonProps } from './BackButton.types';

/** Chevron points to the inline-start; named back for screen readers. */
export function BackButton({ onPress, busy = false, disabled = false, testID }: BackButtonProps) {
  const { color } = useTheme();
  return (
    <IconButton label={t.common.back} onPress={onPress} disabled={busy || disabled} testID={testID}>
      <Chevron to="prev" color={color.ink} size={22} />
    </IconButton>
  );
}
