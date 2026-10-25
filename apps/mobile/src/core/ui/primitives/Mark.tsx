import { Image } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import markLarge from '../../../../assets/brand/mark.png';
import markSmall from '../../../../assets/brand/mark-small.png';

// Logo mark (docs/07 §11): the academy's own emblem, the open Mushaf on its green rahle inside the
// gold eight-point star, exported transparent by docs/design/brand/tools/build.mjs. It keeps its own
// ivory, so it reads in both themes. 32pt or less shows the Mushaf crop (the star is illegible there).
const SMALL_MARK_MAX = 32;

export interface MarkProps {
  /** Rendered size (a square box, the emblem is contained); ≤ 32 switches to the Mushaf crop. */
  size?: number;
  /** Decorative by default; `labelled` exposes it as an image named «آيات البيان». */
  labelled?: boolean;
}

export function Mark({ size = 28, labelled = false }: MarkProps) {
  const small = size <= SMALL_MARK_MAX;
  const a11y = labelled
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: t.app.brand }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Image
      source={small ? markSmall : markLarge}
      resizeMode="contain"
      style={{ width: size, height: size }}
      testID={small ? 'mark-small' : 'mark-large'}
      {...a11y}
    />
  );
}
