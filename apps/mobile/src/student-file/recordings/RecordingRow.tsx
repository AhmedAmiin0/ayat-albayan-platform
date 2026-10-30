import { memo, useCallback } from 'react';
import { RIYADH_TZ, type StudentRecordingView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { durationText, sizeText, teacherLabel } from './recording-format';
import { RecordingDelete } from './RecordingDelete';
import { RecordingPlay } from './RecordingPlay';
import { RecordingVisibility } from './RecordingVisibility';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { useStableHandler } from '@/core/lib/stable-handler';

const R = t.mobileStudentFile.recordings;
const CHIP = {
  recording: { tone: 'act', glyph: 'half' },
  done: { tone: 'ok', glyph: 'fill' },
  failed: { tone: 'bad', glyph: 'struck' },
  deleted: { tone: 'neutral', glyph: 'hollow' },
} as const;

interface RecordingRowProps {
  rec: StudentRecordingView;
  studentId: string;
  tz?: string;
  /** recordings.manage held: the toggle (if the row allows it). */
  canManage: boolean;
  /** Admin (and recordings.manage): the delete button. */
  canDelete: boolean;
  /** Stable: a fresh signed link for this recording's id. */
  getUrl: (id: string) => Promise<string | null>;
}

/**
 * One recording: when, who taught, length, size, status, play, the visibility switch and delete. No fill
 * or rule of its own: the list's inset card draws them (owner 2026-10-28: one container rule).
 */
const RecordingRow = memo(function RecordingRow({ rec, studentId, tz = RIYADH_TZ, canManage, canDelete, getUrl }: RecordingRowProps) {
  const cycle = useClockCycle();
  const url = useCallback(() => getUrl(rec.id), [getUrl, rec.id]);
  const { color } = useTheme();
  const when = whenIn(new Date(rec.lesson_starts_at), tz, cycle);
  const fact = (label: string, value: string) => (
    <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums'] }}>
      {`${label}: ${value}`}
    </AppText>
  );
  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
          {R.lessonAt.replace('{when}', when)}
        </AppText>
        <StatusChip {...CHIP[rec.status]} label={R.status[rec.status]} size="sm" />
      </View>
      {fact(R.teacher, rec.teacher ? teacherLabel(rec.teacher) : R.unknown)}
      {fact(R.duration, durationText(rec.duration_seconds))}
      {fact(R.size, sizeText(rec.size_bytes))}
      {rec.status === 'done' ? <RecordingPlay when={when} getUrl={url} /> : null}
      {rec.status !== 'deleted' ? (
        <RecordingVisibility rec={rec} studentId={studentId} editable={canManage && rec.can_manage} />
      ) : null}
      {canDelete && rec.can_manage && rec.status !== 'deleted' && rec.status !== 'recording' ? (
        <RecordingDelete id={rec.id} studentId={studentId} />
      ) : null}
    </View>
  );
});

interface RecordingRowsOptions {
  studentId: string;
  /** The teacher's own profile (their tz); none for the admin: Riyadh. */
  me: { tz: string } | undefined;
  manage: boolean;
  /** The admin's list: delete too. */
  admin: boolean;
  freshUrl: (id: string) => Promise<string | null>;
}

/** The list's renderItem, stable while its options are: a refetch redraws only the changed recordings. */
export function useRecordingRow({ studentId, me, manage, admin, freshUrl }: RecordingRowsOptions) {
  const tz = me?.tz ?? RIYADH_TZ;
  const getUrl = useStableHandler(freshUrl);
  // Keyed by the recording: play and delete hold state that a recycled row must not carry over.
  return useCallback(
    ({ item }: { item: StudentRecordingView }) => (
      <RecordingRow
        key={item.id}
        rec={item}
        studentId={studentId}
        tz={tz}
        canManage={manage}
        canDelete={admin && manage && item.can_manage}
        getUrl={getUrl}
      />
    ),
    [studentId, tz, manage, admin, getUrl],
  );
}
