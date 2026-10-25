import type { Glyph, Tone } from '@ab/shared';
import { Pressable, ScrollView, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { NuqtaGlyph } from '../primitives/NuqtaGlyph';
import { toneColors } from '../feedback/StatusChip';
import { AppText } from '../primitives/AppText';

export interface FilterPill<V extends string> {
  value: V;
  /** ar.json word: t.leads.filterAll, t.enums.leadStatus.new… */
  label: string;
  /** Status filters carry their status shape: spread leadStatusStyle[s]. */
  tone?: Tone;
  glyph?: Glyph;
  /** Only a number the API returned (e.g. `total` of that filtered list). Never invent one. */
  count?: number;
  /** Shown but not choosable (a hint beside it says where it lives): «حجز تعويضي» on a lead. */
  disabled?: boolean;
}

export interface FilterPillsProps<V extends string> {
  items: readonly FilterPill<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group for screen readers, e.g. t.leads.statusFilter. */
  accessibilityLabel: string;
  /** 'radiogroup' when a pill sets a value (a student's status, the appearance) instead of filtering. */
  role?: 'tablist' | 'radiogroup';
  /**
   * Wrap onto as many rows as needed so every option is in view (a picker with a few choices: time
   * zone, source, package) instead of one scrolling row that hides most of them.
   */
  wrap?: boolean;
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
}: FilterPillsProps<V>) {
  const { color } = useTheme();
  const radio = role === 'radiogroup';
  const pills = items.map((item) => {
    const selected = item.value === value;
    const fg = selected ? color.onInverse : color.ink;
    return (
      <Pressable
        key={item.value}
        accessibilityRole={radio ? 'radio' : 'tab'}
        accessibilityState={{
          ...(radio ? { checked: selected } : { selected }),
          ...(item.disabled ? { disabled: true } : {}),
        }}
        disabled={item.disabled}
        onPress={() => onChange(item.value)}
        hitSlop={{ top: 4, bottom: 4 }}
        style={{
          opacity: item.disabled ? 0.5 : 1,
          minHeight: radio ? 44 : 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          borderRadius: shape.radius.pill,
          borderWidth: 1,
          borderColor: selected ? color.inverse : color.rule,
          backgroundColor: selected ? color.inverse : color.raised,
        }}
      >
        {item.glyph ? (
          <NuqtaGlyph shape={item.glyph} color={selected ? fg : toneColors(color, item.tone ?? 'neutral').fg} />
        ) : null}
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.sm,
            lineHeight: 22,
            color: fg,
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.label}
          {item.count === undefined ? '' : ` ${item.count}`}
        </AppText>
      </Pressable>
    );
  });
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      // RN gives a horizontal ScrollView flexGrow 1: beside a flex: 1 list it took a share of the
      // screen's height and stretched every pill into a tall capsule (two pill rows on «المحادثات»).
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {pills}
    </ScrollView>
  );
}
