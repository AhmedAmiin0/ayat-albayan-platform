import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { teacherText, whenText } from '@/lessons';
import { panel } from './next-panel.helpers';
import type { NextPanelProps } from './NextPanel.types';

/** On the lapis wash, as the staff hero: the lead, when (the student's clock), the teacher. */
export function NextPanel({ lesson, clock, now }: NextPanelProps) {
  const { color } = useTheme();
  const teacher = t.portal.app.lesson.teacher.replace('{name}', teacherText(lesson.teacher));
  return (
    <View style={{ ...panel, backgroundColor: color.lapisWash }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], color: color.lapis }}>
        {t.portal.nextLesson}
      </AppText>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.base,
          color: color.coverInk,
          fontVariant: ['tabular-nums'],
        }}
      >
        {whenText(new Date(lesson.starts_at), clock, now)}
      </AppText>
      <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{teacher}</AppText>
    </View>
  );
}
