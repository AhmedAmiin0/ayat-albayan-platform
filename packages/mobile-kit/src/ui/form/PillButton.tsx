import type { Glyph, Tone } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { shape, type, useTheme } from '../../theme';
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
  /** The count is also in the pill's spoken name; none while 0. */
  badge?: { count: number; label: string };
  /** Shown but not choosable; a hint beside it says where it lives. */
  disabled?: boolean;
}

interface PillButtonProps<V extends string> {
  item: FilterPill<V>;
  selected: boolean;
  /** A radio (sets a value) instead of a tab. */
  radio: boolean;
  /** The tighter pill of a strip made to fit one row (FilterPills `fit`). */
  tight: boolean;
  onPress: (value: V) => void;
}

/** The unread number in its circle (decorative: the pill's name says it). */
function Badge({ count }: { count: number }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: shape.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.lapisFill,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: 11,
          lineHeight: 16,
          color: color.onLapis,
          fontVariant: ['tabular-nums'],
        }}
      >
        {count}
      </AppText>
    </View>
  );
}

type Colors = ReturnType<typeof useTheme>['color'];

/** Selected = the action green on its wash (owner 2026-10-29, option A); else ink on raised. */
function pillLook(color: Colors, selected: boolean) {
  return selected
    ? { fg: color.lapis, border: color.lapisWash, fill: color.lapisWash }
    : { fg: color.ink, border: color.rule, fill: color.raised };
}

/** A radio is checked, a tab selected; a disabled one says so. */
const a11yState = (radio: boolean, selected: boolean, disabled = false) => ({
  ...(radio ? { checked: selected } : { selected }),
  ...(disabled ? { disabled } : {}),
});

/** The glyph's ink: the selected green, else its status tone. */
const glyphInk = (color: Colors, item: FilterPill<string>, selected: boolean) =>
  selected ? pillLook(color, selected).fg : toneColors(color, item.tone ?? 'neutral').fg;

/** « 12» after the word when the API gave a count. */
const countText = (count: number | undefined) => (count === undefined ? '' : ` ${count}`);

/** A radio keeps the 44pt touch height, a tab 36; a fitted strip's pill is tighter. */
const box = (radio: boolean, tight: boolean, disabled = false) => ({
  opacity: disabled ? 0.5 : 1,
  minHeight: radio ? 44 : 36,
  paddingHorizontal: tight ? 8 : 14,
});

/** The unread badge while there is one. */
const shownBadge = (badge: FilterPill<string>['badge']) =>
  badge && badge.count > 0 ? badge : null;

/** One pill: its glyph, its word (and the API's count), its unread badge. */
export function PillButton<V extends string>(props: PillButtonProps<V>) {
  const { item, selected, radio, tight, onPress } = props;
  const { color } = useTheme();
  const look = pillLook(color, selected);
  const badge = shownBadge(item.badge);
  return (
    <Pressable
      accessibilityRole={radio ? 'radio' : 'tab'}
      accessibilityLabel={badge?.label}
      accessibilityState={a11yState(radio, selected, item.disabled)}
      disabled={item.disabled}
      onPress={() => onPress(item.value)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={{
        ...box(radio, tight, item.disabled),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: look.border,
        backgroundColor: look.fill,
      }}
    >
      {item.glyph ? (
        <NuqtaGlyph shape={item.glyph} color={glyphInk(color, item, selected)} />
      ) : null}
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: 22,
          color: look.fg,
          fontVariant: ['tabular-nums'],
        }}
      >
        {item.label}
        {countText(item.count)}
      </AppText>
      {badge ? <Badge count={badge.count} /> : null}
    </Pressable>
  );
}
