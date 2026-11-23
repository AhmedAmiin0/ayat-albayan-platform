import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '#/nav/index.ts';
import { studentOf, usePortalMe } from '#/portal/index.ts';
import { LoadState } from '#/ui/index.ts';
import { RecordingsList } from './RecordingsList';
import { useChildRecordings } from './use-assets';

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * «التسجيلات» of the child in view (canvas RecXFamilyList), `recordings/[id]`: recordings staff
 * made visible, of sent lessons with one student, by month; each opens the lesson page.
 */
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
