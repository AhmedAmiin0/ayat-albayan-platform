import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { SendIcon } from '../../shared/chat-icons';
import { MicIcon } from '../../shared/composer-icons';

interface RoundActionProps {
  mode: 'mic' | 'send';
  /** «أرسل» only: nothing to send, or a send on its way. */
  disabled?: boolean;
  onSend?: () => void;
}

/**
 * The round 44pt button at the row's end (owner 2026-10-27, as WhatsApp): the microphone while there
 * is nothing else to send (MicHold around it takes the hold), «أرسل» otherwise, its plane mirrored
 * in Arabic. The icon crossfades in 120 ms when the mode changes; not with «Reduce Motion».
 */
export function RoundAction({ mode, disabled = false, onSend }: RoundActionProps) {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const [fade] = useState(() => new Animated.Value(1));
  const shown = useRef(mode);
  useEffect(() => {
    if (shown.current === mode) return;
    shown.current = mode;
    if (still) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, [mode, still, fade]);
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const icon = (
    <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
      {mode === 'mic' ? <MicIcon color={color.onLapis} /> : <SendIcon color={color.onLapis} />}
    </Animated.View>
  );
  if (mode === 'mic') {
    return (
      <View
        testID="mic-circle"
        style={{
          width: shape.control.touch,
          height: shape.control.touch,
          borderRadius: shape.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.lapisFill,
        }}
      >
        {icon}
      </View>
    );
  }
  return (
    <IconButton variant="filled" label={t.inbox.composer.send} disabled={disabled} onPress={() => onSend?.()}>
      {icon}
    </IconButton>
  );
}
