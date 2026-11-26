import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, usePortalMe } from '@/portal';
import { LoadState } from '@/ui';
import { RecordingsList } from '@/recordings/RecordingsList';
import { useChildRecordings } from '@/recordings/use-assets';

const paramsSchema = z.object({ id: z.string().min(1) });

/** Only recordings staff made visible, of sent single-student lessons, by month. */
export function RecordingsScreen() {
  const { id } = paramsSchema.parse(useLocalSearchParams());
  const student = studentOf(usePortalMe().data, id);
  const list = useChildRecordings(id);
  return (
    <FamilyPage
      header={<FamilyHeader title={t.lessonFiles.recordings} subtitle={student?.name} back />}
      onRefresh={() => list.refetch()}
    >
      {student ? (
        <LoadState query={list}>
          {(data) => <RecordingsList data={data} student={student} />}
        </LoadState>
      ) : null}
    </FamilyPage>
  );
}
