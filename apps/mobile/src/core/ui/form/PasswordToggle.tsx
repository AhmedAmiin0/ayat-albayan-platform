import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';

interface PasswordToggleProps {
  shown: boolean;
  onToggle: () => void;
}

const EYE = 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';

/**
 * The eye at the inline-end of a password Field: a 44pt toggle that shows the typed text (an open
 * eye while hidden, struck through once shown). One spoken name; the checked state says which.
 */
export function PasswordToggle({ shown, onToggle }: PasswordToggleProps) {
  const { color } = useTheme();
  return (
    <Pressable
      testID="password-toggle"
      accessibilityRole="togglebutton"
      accessibilityLabel={t.auth.showPassword}
      accessibilityState={{ checked: shown }}
      onPress={onToggle}
      hitSlop={4}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 0,
        bottom: 0,
        end: 0,
        width: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        backgroundColor: pressed ? color.lapisWash : 'transparent',
      })}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={color.ink2} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <Path d={EYE} />
        {shown ? <Path d="M4 4l16 16" /> : null}
      </Svg>
    </Pressable>
  );
}
