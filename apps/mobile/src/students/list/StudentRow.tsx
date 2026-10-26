import { studentStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { studentNote } from '../profile/student-note';
import { StudentNote } from '../profile/StudentNote';
import type { StudentListItem } from '../shared/types';

/** Name + AB-code, guardian under it; status chip and the «دورك» note at the inline-end. */
export function StudentRow({ student }: { student: StudentListItem }) {
  const note = studentNote(student);
  return (
    <ListRow
      title={student.name}
      meta={student.code ?? undefined}
      subtitle={student.guardian_name}
      onPress={() => router.push(`/students/${student.id}`)}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusChip
            {...studentStatusStyle[student.status]}
            label={t.enums.studentStatus[student.status]}
            size="sm"
          />
          {note ? <StudentNote text={note} /> : null}
        </View>
      }
    />
  );
}
