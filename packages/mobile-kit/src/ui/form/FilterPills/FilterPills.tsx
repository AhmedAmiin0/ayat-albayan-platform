import { ScrollView, View } from 'react-native';
import { PillButton, type FilterPill } from '../PillButton';

export type { FilterPill } from '../PillButton';

/** `fit`: the row spans the width, its pills spread with the slack between them. */
const SPREAD = { flexGrow: 1, justifyContent: 'space-between', gap: 4 } as const;

interface FilterPillsProps<V extends string> {
  items: readonly FilterPill<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group for screen readers, e.g. t.leads.statusFilter. */
  accessibilityLabel: string;
  /** 'radiogroup' when a pill sets a value (a student's status, the appearance), not a filter. */
  role?: 'tablist' | 'radiogroup';
  /**
   * Wrap onto as many rows as needed so every option is in view (a picker with a few choices: time
   * zone, source, package) instead of one scrolling row that hides most of them.
   */
  wrap?: boolean;
  /**
   * One row spread across the width with tighter pills (canvas ChatXFamilyEntry: five sections in
   * 358pt); it still scrolls sideways when a larger text size cannot fit them.
   */
  fit?: boolean;
}

/**
 * Single-choice pills (docs/07 §12 Today, §9 fihris under 900px): tabs or radios. Filters scroll
 * sideways in one row; a picker passes `wrap` and shows every option.
 */
export function FilterPills<V extends string>({
  items,
  value,
  onChange,
  accessibilityLabel,
  role = 'tablist',
  wrap = false,
  fit = false,
}: FilterPillsProps<V>) {
  const radio = role === 'radiogroup';
  const pills = items.map((item) => (
    <PillButton
      key={item.value}
      item={item}
      selected={item.value === value}
      radio={radio}
      tight={fit}
      onPress={onChange}
    />
  ));
  if (wrap) {
    return (
      <View
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 }}
      >
        {pills}
      </View>
    );
  }
  const spread = fit ? SPREAD : { gap: 8 };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      // RN gives a horizontal ScrollView flexGrow 1: beside a flex: 1 list it took a share of
      // the screen's height and stretched every pill into a tall capsule (two rows on «المحادثات»).
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ ...spread, paddingVertical: 4 }}
    >
      {pills}
    </ScrollView>
  );
}
