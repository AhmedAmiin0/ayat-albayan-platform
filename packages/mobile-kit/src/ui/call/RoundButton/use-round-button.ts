import type { PressableStateCallbackType } from 'react-native';
import { useTheme } from '../../../theme';
import { roundColors } from './round-button.helpers';
import type { RoundButtonProps } from './RoundButton.types';

export function useRoundButton({ tone, pressed }: Pick<RoundButtonProps, 'tone' | 'pressed'>) {
  const { color } = useTheme();
  const { fill, ink, edge } = roundColors(color, tone, pressed ?? false);
  const selected = pressed === undefined ? undefined : { selected: pressed };
  const pressStyle = ({ pressed: down }: PressableStateCallbackType) => ({
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: fill,
    ...edge,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: down ? 0.85 : 1,
  });
  return { ink, selected, pressStyle };
}
