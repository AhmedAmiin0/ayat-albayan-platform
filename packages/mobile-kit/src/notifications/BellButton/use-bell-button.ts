import type { PressableStateCallbackType } from 'react-native';
import { shape, useTheme } from '../../theme';
import { bellBadge, bellLabel } from '../notifications-cache';
import { useNotifications } from '../use-notifications';
import type { BellButtonProps } from './BellButton.types';

export function useBellButton({ round = false }: Pick<BellButtonProps, 'round'>) {
  const { color } = useTheme();
  const unread = useNotifications().data?.unread ?? 0;
  const badge = bellBadge(unread);
  const label = bellLabel(unread);
  const pressStyle = ({ pressed }: PressableStateCallbackType) => ({
    width: shape.control.touch,
    height: shape.control.touch,
    borderRadius: round ? shape.control.touch / 2 : shape.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: pressed ? color.lapisWash : 'transparent',
  });
  return { badge, label, pressStyle };
}
