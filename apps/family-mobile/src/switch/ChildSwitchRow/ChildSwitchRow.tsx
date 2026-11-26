import { Pressable } from 'react-native';
import { Avatar, useTheme } from '@ab/mobile-kit';
import { NewMark } from '@/ui';
import type { ChildSwitchRowProps } from './ChildSwitchRow.types';
import { Check } from './Check';
import { RowWords } from './RowWords';
import { useChildSwitchRow } from './use-child-switch-row';

export function ChildSwitchRow({ student, kind, current, onPress }: ChildSwitchRowProps) {
  const { color } = useTheme();
  const { fresh, name, next } = useChildSwitchRow({ student, kind });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: current || pressed ? color.lapisWash : undefined,
      })}
    >
      <Avatar name={student.name} id={student.id} decorative />
      <RowWords name={name} code={student.code} next={next} />
      {fresh ? <NewMark /> : null}
      {current ? <Check color={color.lapis} /> : null}
    </Pressable>
  );
}
