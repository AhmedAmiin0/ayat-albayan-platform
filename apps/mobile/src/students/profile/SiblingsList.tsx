import { studentStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SectionLabel } from '../list/SectionLabel';
import type { StudentRef } from '../shared/types';

/** Other students on the same guardian phone; a tap opens that student's quick view. */
export function SiblingsList({ siblings }: { siblings: StudentRef[] }) {
  if (siblings.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.students.siblings}</SectionLabel>
      {/* Rows run edge to edge; ListRow has its own 16pt padding. */}
      <View style={{ marginHorizontal: -16 }}>
        {siblings.map((s) => (
          <ListRow
            key={s.id}
            title={s.name}
            meta={s.code ?? undefined}
            onPress={() => router.push(`/students/${s.id}`)}
            trailing={
              <StatusChip
                {...studentStatusStyle[s.status]}
                label={t.enums.studentStatus[s.status]}
                size="sm"
              />
            }
          />
        ))}
      </View>
    </View>
  );
}
