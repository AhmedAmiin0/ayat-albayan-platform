import { Pressable } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';

export interface ListChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  /** A list's chip: long-press, or the named accessibility action, opens rename / delete. */
  onEdit?: () => void;
  /** «＋» (a new list) acts (opens the sheet) instead of filtering. */
  action?: boolean;
  name?: string;
}

type Palette = ReturnType<typeof useTheme>['color'];

/** Filled when active; «＋» reads as an action (lapis on the input edge). */
function look(color: Palette, { selected = false, action = false }: Pick<ListChipProps, 'selected' | 'action'>) {
  if (selected) return { bg: color.inverse, edge: color.inverse, ink: color.onInverse };
  return {
    bg: color.raised,
    edge: action ? color.ruleInput : color.rule,
    ink: action ? color.lapis : color.ink,
  };
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

/** A 32pt pill with a 44pt hit area; list chips expose edit as a named accessibility action. */
export function ListChip({
  label,
  onPress,
  selected = false,
  onEdit,
  action = false,
  name,
}: ListChipProps) {
  const ink = look(useTheme().color, { selected, action });
  return (
    <Pressable
      accessibilityRole={action ? 'button' : 'tab'}
      accessibilityLabel={name}
      accessibilityState={action ? {} : { selected }}
      onPress={onPress}
      {...editProps(onEdit)}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        minHeight: 32,
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
