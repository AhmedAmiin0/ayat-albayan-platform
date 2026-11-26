import { View } from 'react-native';
import { t, AppText, EmptyState, ErrorState, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import type { RecordingSource } from './recording-format';
import { RecordingRow } from './RecordingRow';
import { useRecordings, useRecordingStatus } from './recordings-api';

const R = t.classroom.recordings;

/** Newest first, with a warning when the server cannot record. */
export function RecordingsList({ source }: { source: RecordingSource }) {
  const list = useRecordings(source);
  const status = useRecordingStatus();
  if (list.isPending) return <AppText>{R.loading}</AppText>;
  if (list.isError && !list.data)
    return <ErrorState message={R.error} onRetry={() => void list.refetch()} />;
  const items = list.data ?? [];
  return (
    <View style={{ gap: 8 }}>
      {status.data?.configured === false ? <Note>{`${R.notConfigured}. ${R.notConfiguredHint}`}</Note> : null}
      {items.length === 0 ? <EmptyState title={source.kind === 'meeting' ? R.emptyMeeting : R.empty} /> : null}
      <InsetGroup>
        {items.map((rec) => (
          <RecordingRow key={rec.id} source={source} rec={rec} />
        ))}
      </InsetGroup>
    </View>
  );
}
