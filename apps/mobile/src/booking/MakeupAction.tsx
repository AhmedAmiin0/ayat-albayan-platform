import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { makeupStudents, type MakeupLessonView } from './contract';
import { makeupParams } from './makeup-draft';

/**
 * «حجز تعويضي» under a missed lesson's row (R-SCH-10): for each student still charged for a
 * no_show / excused lesson (so a group lesson offers one per child), not a trial, not itself a
 * makeup. It opens the makeup wizard for that student and lesson. Admin schedule only.
 */
export function MakeupAction({ lesson }: { lesson: MakeupLessonView }) {
  const students = makeupStudents(lesson, new Date());
  if (students.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
      {students.map((student) => (
        <Button
          key={student.id}
          variant="ghost"
          label={t.booking.makeup.action}
          accessibilityLabel={`${t.booking.makeup.action} — ${student.name}`}
          onPress={() =>
            router.push({
              pathname: '/students/makeup/[lessonId]',
              params: makeupParams(lesson, student),
            })
          }
        />
      ))}
    </View>
  );
}
