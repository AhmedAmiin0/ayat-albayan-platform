import {
  lessonRecordingViewSchema,
  roomRecordingStateSchema,
  type LessonRecordingView,
} from '@ab/schedule';
import { asResponse } from '@/common/http/returns';
import type { ListedRecording } from './recording.repo';

const stateOf = (status: string) => roomRecordingStateSchema.catch('failed').parse(status);

/** A row as the clients see it; `url` only for a finished file. */
export function toRecordingView(row: ListedRecording, url: string | null): LessonRecordingView {
  const status = stateOf(row.status);
  const view = { id: row.id, status, started_at: row.started_at, ended_at: row.ended_at };
  return asResponse(lessonRecordingViewSchema, { ...view, url: status === 'done' ? url : null });
}
