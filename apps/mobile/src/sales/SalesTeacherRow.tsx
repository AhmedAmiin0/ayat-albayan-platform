import type { SalesTeacherView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ListRow } from '@/ui/ListRow';
import { Ltr } from '@/ui/Ltr';
import { teacherLabel, teacherSubtitle } from './sales-text';

/**
 * One active teacher (read-only): name, gender · programs, then the students they teach with their codes.
 * Never pay, rates, phone or meeting link (the API does not send them).
 */
export function SalesTeacherRow({ teacher }: { teacher: SalesTeacherView }) {
  const { color } = useTheme();
  const name = teacherLabel(teacher);
  const students =
    teacher.students.length === 0 ? (
      <Note>{t.sales.teachers.noStudents}</Note>
    ) : (
      <View
        accessibilityLabel={t.sales.mobile.studentsOf.replace('{name}', name)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}
      >
        {teacher.students.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink }}>{s.name}</AppText>
            <Ltr style={{ fontSize: type.size.xs, color: color.ink3 }}>{s.code}</Ltr>
          </View>
        ))}
      </View>
    );
  return <ListRow title={name} subtitle={teacherSubtitle(teacher)} tags={students} />;
}
