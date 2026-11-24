import { studentStatusStyle } from '@ab/money';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, ListRow, StatusChip, InsetGroup } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import type { StudentRef } from '@ab/shared';

/** Other students on the same guardian phone; a tap opens that student's quick view. */
export function SiblingsList({ siblings }: { siblings: StudentRef[] }) {
  const to = useStudentHref();
  if (siblings.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.students.siblings}</SectionLabel>
      {/* Owner 2026-10-28 (one container rule): the rows sit in one inset card inside the gutter. */}
      <InsetGroup>
        {siblings.map((s) => (
          <ListRow
            key={s.id}
            title={s.name}
            meta={s.code ?? undefined}
            onPress={() => router.push(to(`/students/${s.id}`))}
            trailing={
              <StatusChip
                {...studentStatusStyle[s.status]}
                label={t.enums.studentStatus[s.status]}
                size="sm"
              />
            }
          />
        ))}
      </InsetGroup>
    </View>
  );
}
