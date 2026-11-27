import { type, useTheme } from '@ab/mobile-kit';
import { useRoomsInApp } from '@/room';
import { SOFT_INK } from './card-footer.helpers';

export function useCardFooter() {
  const { color } = useTheme();
  const inApp = useRoomsInApp();
  const note = { color: color.onLapis, fontSize: type.size.xs, opacity: SOFT_INK };
  return { inApp, note };
}
