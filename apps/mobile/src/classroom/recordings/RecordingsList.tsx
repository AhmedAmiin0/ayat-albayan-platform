import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import type { RecordingSource } from './recording-format';
import { RecordingRow } from './RecordingRow';
import { useRecordings, useRecordingStatus } from './recordings-api';

const R = t.classroom.recordings;

/** The recordings of a lesson or meeting, newest first, with the «التسجيل غير مفعّل» warning when the server can't record. */
export function RecordingsList({ source }: { source: RecordingSource }) {
  const list = useRecordings(source);
  const status = useRecordingStatus();
  if (list.isPending) return <AppText>{R.loading}</AppText>;
  if (list.isError && !list.data) return <ErrorState message={R.error} onRetry={() => void list.refetch()} />;
  const items = list.data ?? [];
  return (
    <View style={{ gap: 8 }}>
      {status.data?.configured === false ? <Note>{`${R.notConfigured}. ${R.notConfiguredHint}`}</Note> : null}
      {items.length === 0 ? <EmptyState title={source.kind === 'meeting' ? R.emptyMeeting : R.empty} /> : null}
      {items.map((rec) => (
        <RecordingRow key={rec.id} source={source} rec={rec} />
      ))}
    </View>
  );
}
