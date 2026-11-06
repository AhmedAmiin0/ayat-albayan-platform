import type { FamilyRing } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

type RingKey = FamilyRing | 'none';

/** Green (`ok`) while subscribed, the gray input rule when a renewal is due; none: a clear frame. */
const BORDER: Record<RingKey, string> = {
  subscribed: 'border-ok',
  renewal: 'border-rule-input',
  none: 'border-transparent',
};

/** The ring's word for the row's accessible name (its chips are gone); none says nothing. */
export const ringWord = (ring: FamilyRing | null | undefined): string =>
  ring ? t.inbox.ring[ring] : '';

interface AvatarRingProps {
  /** ThreadView.ring (familyRing on the API); null/absent = no ring. */
  ring: FamilyRing | null | undefined;
  className?: string;
  children: ReactNode;
}

/**
 * A status ring around a chat row's avatar (owner 2026-11-06): 2px, 2px off the circle. Every row
 * keeps the frame (transparent without a ring), so names line up whatever the family's state.
 * Drawn only: the row's aria-label carries ringWord.
 */
export function AvatarRing({ ring, className, children }: AvatarRingProps) {
  const key: RingKey = ring ?? 'none';
  return (
    <span
      data-ring={key}
      className={cn('inline-grid shrink-0 rounded-full border-2 p-[2px]', BORDER[key], className)}
    >
      {children}
    </span>
  );
}
