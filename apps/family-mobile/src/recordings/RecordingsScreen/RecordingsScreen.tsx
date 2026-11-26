import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { LoadState } from '@/ui';
import { RecordingsList } from '@/recordings/RecordingsList';
import { useRecordingsScreen } from './use-recordings-screen';

/** Only recordings staff made visible, of sent single-student lessons, by month. */
export function RecordingsScreen() {
  const { student, list } = useRecordingsScreen();
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
