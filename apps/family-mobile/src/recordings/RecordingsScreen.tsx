import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, usePortalMe } from '@/portal';
import { LoadState } from '@/ui';
import { RecordingsList } from './RecordingsList';
import { useChildRecordings } from './use-assets';

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * «التسجيلات» of the child in view (canvas RecXFamilyList), `recordings/[id]`: recordings staff
 * made visible, of sent lessons with one student, by month; each opens the lesson page.
 */
export function RecordingsScreen() {
  const { color } = useTheme();
  const { id } = paramsSchema.parse(useLocalSearchParams());
  const student = studentOf(usePortalMe().data, id);
  const list = useChildRecordings(id);
  return (
    <FamilyPage
      header={<FamilyHeader title={t.lessonFiles.recordings} subtitle={student?.name} back />}
      onRefresh={() => list.refetch()}
    >
      <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
        {t.lessonFiles.recordingsHint}
      </AppText>
      {student ? (
        <LoadState query={list}>
          {(data) => <RecordingsList data={data} student={student} />}
        </LoadState>
      ) : null}
    </FamilyPage>
  );
}
