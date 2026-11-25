import type { FamilyRing } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, useTheme, type Palette } from '@ab/mobile-kit';

type RingKey = FamilyRing | 'none';

/** Green (`ok`) while subscribed, the gray input rule when a renewal is due; none: clear. */
const COLOR: Record<RingKey, (c: Palette) => string> = {
  subscribed: (c) => c.ok,
  renewal: (c) => c.ruleInput,
  none: () => 'transparent',
};

interface AvatarRingProps {
  /** ThreadView.ring (familyRing on the API); null/absent = no ring. */
  ring: FamilyRing | null | undefined;
  children: ReactNode;
}

/**
 * A status ring around the row's avatar: 2px, 2px off the circle. Every row
 * keeps the frame (transparent without a ring), so names line up whatever the family's state.
 * Drawn only: the row reads ringHint (a child's label is lost inside the row's button on iOS).
 */
export function AvatarRing({ ring, children }: AvatarRingProps) {
  const { color } = useTheme();
  const key: RingKey = ring ?? 'none';
  return (
    <View
      testID={`avatar-ring-${key}`}
      style={{ padding: 2, borderWidth: 2, borderRadius: 999, borderColor: COLOR[key](color) }}
    >
      {children}
    </View>
  );
}

export const ringHint = (ring: FamilyRing | null | undefined): string | undefined =>
  ring ? t.inbox.ring[ring] : undefined;
