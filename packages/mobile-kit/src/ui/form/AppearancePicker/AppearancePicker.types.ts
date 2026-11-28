import type { SegmentedButtonColors } from '@expo/ui/jetpack-compose';
import type { AppearancePref } from '../../../lib/appearance/appearance';
import type { FilterPill } from '../FilterPills';

export interface AppearanceChoice {
  pref: AppearancePref;
  choose: (pref: AppearancePref) => void;
  items: readonly FilterPill<AppearancePref>[];
  /** The group's spoken name, also the section heading. */
  label: string;
  /** The pill look for Material's segments. */
  colors: SegmentedButtonColors;
  /** The pills' face for a segment's label. */
  labelStyle: { fontFamily: string; fontSize: number };
}
