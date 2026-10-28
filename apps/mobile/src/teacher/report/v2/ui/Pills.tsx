import { Pressable, View, type DimensionValue } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface PillsProps<V extends string> {
  /** The group's spoken name («تقييم التسميع», «الحضور»). */
  label: string;
  items: readonly { value: V; label: string }[];
  isOn: (value: V) => boolean;
  onPress: (value: V) => void;
  disabled?: boolean;
  /** radio: one choice (radiogroup); check: any number (the quick notes). */
  role?: 'radio' | 'checkbox';
  /** chip: wrapping pills; grid: two boxes a row (الحضور); row: equal boxes on one line (البرنامج). */
  layout?: 'chip' | 'grid' | 'row';
}

type Layout = NonNullable<PillsProps<string>['layout']>;

const BASIS: Record<Layout, DimensionValue | undefined> = {
  chip: undefined,
  grid: '45%',
  row: 0,
};

type Palette = ReturnType<typeof useTheme>['color'];

/** Boxes (grid / row) are centred, pills hug their word. */
const FORM = {
  box: {
    button: { alignItems: 'center', paddingHorizontal: 8, borderRadius: shape.radius.md },
    text: { textAlign: 'center', size: type.size.sm },
  },
  pill: {
    button: { paddingHorizontal: 12, borderRadius: shape.radius.pill },
    text: { textAlign: 'left', size: type.size.xs },
  },
} as const;

/** One button's look: filled green when chosen, sunk otherwise. */
function look(opts: { on: boolean; layout: Layout; disabled?: boolean }, color: Palette) {
  const { on, layout } = opts;
  const form = FORM[layout === 'chip' ? 'pill' : 'box'];
  return {
    button: {
      ...form.button,
      flexBasis: BASIS[layout],
      flexGrow: layout === 'chip' ? 0 : 1,
      minHeight: shape.control.touch,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: on ? color.lapisFill : color.rule,
      backgroundColor: on ? color.lapisFill : color.sunk,
      opacity: opts.disabled && !on ? 0.6 : 1,
    },
    text: {
      textAlign: form.text.textAlign,
      fontFamily: type.ui[600],
      fontSize: form.text.size,
      lineHeight: type.lineHeight(form.text.size),
      color: on ? color.onLapis : color.ink2,
    },
  };
}

/** The v2 form's choice buttons: the chosen one filled green with white text, the rest sunk. */
export function Pills<V extends string>(p: PillsProps<V>) {
  const { color } = useTheme();
  const layout = p.layout ?? 'chip';
  return (
    <View
      accessibilityRole={p.role === 'checkbox' ? undefined : 'radiogroup'}
      accessibilityLabel={p.label}
      style={{
        flexDirection: 'row',
        flexWrap: layout === 'row' ? 'nowrap' : 'wrap',
        gap: layout === 'chip' ? 6 : 8,
      }}
    >
      {p.items.map((item) => {
        const on = p.isOn(item.value);
        const style = look({ on, layout, disabled: p.disabled }, color);
        return (
          <Pressable
            key={item.value}
            accessibilityRole={p.role ?? 'radio'}
            accessibilityLabel={item.label}
            accessibilityState={{ checked: on, disabled: !!p.disabled }}
            disabled={p.disabled}
            onPress={() => p.onPress(item.value)}
            style={style.button}
          >
            <AppText style={style.text}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
