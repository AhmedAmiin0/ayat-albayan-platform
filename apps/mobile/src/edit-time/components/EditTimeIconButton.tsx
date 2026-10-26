import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { studentNames } from '@/today/lib/lesson-text';
import { editMode, type EditableLesson } from '../lib/types';

export interface EditTimeIconButtonProps {
  lesson: EditableLesson;
  onPress: () => void;
}

/**
 * «عدّل الوقت» as a 44pt pencil for a row that has no room for a labelled button (an ended lesson
 * on Today, docs/07 §12: one 42pt line). The spoken name carries the action and the students.
 */
export function EditTimeIconButton({ lesson, onPress }: EditTimeIconButtonProps) {
  const { color } = useTheme();
  if (editMode(lesson) === null) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.editTime.action} — ${studentNames(lesson)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        marginVertical: -1,
        borderRadius: shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? color.lapisWash : 'transparent',
      })}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={color.lapis} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
        <Path d="M14.5 7.5l3 3" />
      </Svg>
    </Pressable>
  );
}
