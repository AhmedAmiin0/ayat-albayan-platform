import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { IconButton } from '../../../ui/primitives/IconButton';
import type { RoundActionProps } from './RoundAction.types';
import { RoundIcon } from './RoundIcon';
import { CIRCLE } from './round-action.helpers';
import { useRoundAction } from './use-round-action';

/** Microphone when nothing else to send, else send, mirrored in RTL; Reduce Motion skips fades. */
export function RoundAction(p: RoundActionProps) {
  const { color } = useTheme();
  const { mode, disabled, onSend, size, fade } = useRoundAction(p);
  if (mode === 'mic') {
    return (
      <View
        testID="mic-circle"
        style={{ ...CIRCLE, width: size, height: size, backgroundColor: color.lapisFill }}
      >
        <RoundIcon mode={mode} fade={fade} />
      </View>
    );
  }
  return (
    <IconButton
      variant="filled"
      label={t.inbox.composer.send}
      disabled={disabled}
      size={size}
      onPress={() => onSend?.()}
    >
      <RoundIcon mode={mode} fade={fade} />
    </IconButton>
  );
}
