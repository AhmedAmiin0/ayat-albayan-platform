import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

export interface ListChipProps {
  label: string;
  onPress: () => void;
  /** The active list (or «الكل»): filled, announced selected. */
  selected?: boolean;
  /** A list's chip: long-press, or the named accessibility action, opens rename / delete. */
  onEdit?: () => void;
  /** «＋ قائمة جديدة» acts (opens the sheet) instead of filtering. */
  action?: boolean;
}

type Palette = ReturnType<typeof useTheme>['color'];

/** Filled when active; «＋ قائمة جديدة» reads as an action (lapis on the input edge). */
function look(color: Palette, { selected = false, action = false }: Pick<ListChipProps, 'selected' | 'action'>) {
  if (selected) return { bg: color.inverse, edge: color.inverse, ink: color.onInverse };
  return { bg: color.raised, edge: action ? color.ruleInput : color.rule, ink: action ? color.lapis : color.ink };
}

/** The long-press and its named accessibility action, on a list's chip only. */
const editProps = (onEdit: (() => void) | undefined) =>
  onEdit
    ? {
        accessibilityActions: [{ name: 'longpress', label: t.inbox.lists.edit }],
        onAccessibilityAction: () => onEdit(),
        accessibilityHint: t.inbox.lists.editHint,
        onLongPress: onEdit,
      }
    : {};

/**
 * One chip of the «القوائم» row, drawn as the filter pills (FilterPills): 36pt with the hit area
 * stretched to 44pt. A list chip offers «تعديل القائمة» to screen readers as a named action.
 */
export function ListChip({ label, onPress, selected = false, onEdit, action = false }: ListChipProps) {
  const ink = look(useTheme().color, { selected, action });
  return (
    <Pressable
      accessibilityRole={action ? 'button' : 'tab'}
      accessibilityState={action ? {} : { selected }}
      onPress={onPress}
      {...editProps(onEdit)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: ink.edge,
        backgroundColor: ink.bg,
      }}
    >
      <AppText
        numberOfLines={1}
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: 22,
          color: ink.ink,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
