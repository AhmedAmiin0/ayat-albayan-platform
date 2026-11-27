import { pressScale, shape, t } from '@ab/mobile-kit';
import type { JoinLook } from './JoinButton.types';

export const idleWord = (short: boolean, live: boolean): string => {
  const card = live ? t.portal.app.live.join : t.portal.join;
  return short ? t.portal.app.lesson.joinShort : card;
};

/** The pill's look: lapis on a row, white on the card; dimmed while the room link loads. */
export const pressStyle =
  ({ short, busy, fill }: JoinLook) =>
  ({ pressed }: { pressed: boolean }) => ({
    minHeight: short ? 44 : 48,
    paddingHorizontal: 14,
    borderRadius: shape.radius.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: fill,
    opacity: busy ? 0.7 : 1,
    transform: [{ scale: pressScale(pressed, busy) }],
  });
