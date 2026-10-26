import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import { ownerColumns, type RoomTarget } from './recording-target';

export type RecordingRow = Tables<'lesson_recordings'>;

const UNIQUE_VIOLATION = '23505';

export interface FinishInput {
  status: 'done' | 'failed';
  endedAt: string;
  error?: string | null;
  /** The finished file's size (egress result); omitted when LiveKit did not say. */
  sizeBytes?: number;
}

/** lesson_recordings (service role; the services guard). */
@Injectable()
export class RecordingQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Claims the room's one running recording before LiveKit is asked. null = one is already running
   * (the unique partial indexes per lesson / per meeting, migrations 189 / 212), so nothing starts.
   */
  async claim(input: { target: RoomTarget; filePath: string; startedAt: string }): Promise<string | null> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .insert({ ...ownerColumns(input.target), file_path: input.filePath, started_at: input.startedAt })
      .select('id')
      .single();
    if (error?.code === UNIQUE_VIOLATION) return null;
    if (error) throw dbError(error);
    return data.id;
  }

  async attachEgress(id: string, egressId: string): Promise<void> {
    const { error } = await this.db.from('lesson_recordings').update({ egress_id: egressId }).eq('id', id);
    if (error) throw dbError(error);
  }

  /** Ends a running claim (LiveKit refused to start it). */
  async finish(id: string, input: FinishInput): Promise<void> {
    await this.finishWhere({ column: 'id', value: id }, input);
  }

  /** The webhook's end of an egress. Only a running row changes, so a replayed event is a no-op. */
  async finishByEgress(egressId: string, input: FinishInput): Promise<void> {
    await this.finishWhere({ column: 'egress_id', value: egressId }, input);
  }

  /** The lesson's or the meeting's recordings, newest first (removed ones are not listed). */
  async forTarget(target: RoomTarget): Promise<RecordingRow[]> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select('*')
      .eq(target.kind === 'lesson' ? 'lesson_id' : 'meeting_id', target.id)
      .neq('status', 'deleted')
      .order('started_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  /** The egress of the room's running recording, if LiveKit has answered for it. */
  async runningEgress(target: RoomTarget): Promise<string | null> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select('egress_id')
      .eq(target.kind === 'lesson' ? 'lesson_id' : 'meeting_id', target.id)
      .eq('status', 'recording')
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.egress_id ?? null;
  }

  private async finishWhere(where: { column: 'id' | 'egress_id'; value: string }, input: FinishInput): Promise<void> {
    const { error } = await this.db
      .from('lesson_recordings')
      .update({
        status: input.status,
        ended_at: input.endedAt,
        error: input.error ?? null,
        ...(input.sizeBytes !== undefined && { size_bytes: input.sizeBytes }),
      })
      .eq(where.column, where.value)
      .eq('status', 'recording');
    if (error) throw dbError(error);
  }
}
