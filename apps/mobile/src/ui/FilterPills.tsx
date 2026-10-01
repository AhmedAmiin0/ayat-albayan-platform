import type { Glyph, Tone } from '@ab/shared';
import { Pressable, ScrollView, Text } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { NuqtaGlyph } from './NuqtaGlyph';
import { toneColors } from './StatusChip';

export interface FilterPill<V extends string> {
  value: V;
  /** ar.json word: t.leads.filterAll, t.enums.leadStatus.new… */
  label: string;
  /** Status filters carry their status shape: spread leadStatusStyle[s]. */
  tone?: Tone;
  glyph?: Glyph;
  /** Only a number the API returned (e.g. `total` of that filtered list). Never invent one. */
  count?: number;
}

export interface FilterPillsProps<V extends string> {
  items: readonly FilterPill<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group for screen readers, e.g. t.leads.statusFilter. */
  accessibilityLabel: string;
}

/** Horizontal, scrolling single-choice pills (docs/07 §12 Today, §9 fihris under 900px). */
export function FilterPills<V extends string>({
  items,
  value,
  onChange,
  accessibilityLabel,
}: FilterPillsProps<V>) {
  const { color } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const fg = selected ? color.onInverse : color.ink;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(item.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              minHeight: 36,
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
              <NuqtaGlyph
                shape={item.glyph}
                color={selected ? fg : toneColors(color, item.tone ?? 'neutral').fg}
              />
            ) : null}
            <Text
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
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
