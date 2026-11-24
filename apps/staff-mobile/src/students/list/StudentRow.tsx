import { memo } from 'react';
import { studentStatusStyle } from '@ab/money';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';
import { studentNote } from '@/students/profile/student-note';
import { StudentNote } from '@/students/profile/StudentNote';
import type { StudentListItem } from '@ab/shared';

export const StudentRow = memo(function StudentRow({ student }: { student: StudentListItem }) {
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
});
