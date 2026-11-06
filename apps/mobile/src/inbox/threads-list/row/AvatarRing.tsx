import type { FamilyRing } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme, type Palette } from '@/theme';

type RingKey = FamilyRing | 'none';

/** Green (`ok`) while subscribed, the gray input rule when a renewal is due; none: a clear frame. */
const COLOR: Record<RingKey, (c: Palette) => string> = {
  subscribed: (c) => c.ok,
  renewal: (c) => c.ruleInput,
  none: () => 'transparent',
};

/** The ring's word for the screen reader (the row's chips are gone): «مشترك» / «يحتاج إلى تجديد». */
const LABEL: Record<RingKey, () => string | undefined> = {
  subscribed: () => t.inbox.ring.subscribed,
  renewal: () => t.inbox.ring.renewal,
  none: () => undefined,
};

interface AvatarRingProps {
  /** ThreadView.ring (familyRing on the API); null/absent = no ring. */
  ring: FamilyRing | null | undefined;
  children: ReactNode;
}

/**
 * A status ring around the row's avatar (owner 2026-11-06): 2px, 2px off the circle. Every row keeps
 * the frame (transparent without a ring), so names line up whatever the family's state.
 */
export function AvatarRing({ ring, children }: AvatarRingProps) {
  const { color } = useTheme();
  const key: RingKey = ring ?? 'none';
  return (
    <View
      testID={`avatar-ring-${key}`}
      accessibilityLabel={LABEL[key]()}
      style={{ padding: 2, borderWidth: 2, borderRadius: 999, borderColor: COLOR[key](color) }}
    >
      {children}
    </View>
  );
}
