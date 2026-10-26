import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { conflict, notFound } from '../../../../common/http/errors';
import { RecordingAdminQueries } from '../recording-admin.queries';
import { RecordingEraser } from './recording-eraser';

/** DELETE /recordings/:id (admin): the file goes, the row stays as `deleted`. Idempotent. */
@Injectable()
export class RecordingDeleteService {
  constructor(
    private readonly queries: RecordingAdminQueries,
    private readonly eraser: RecordingEraser,
  ) {}

  /** 404 recording_not_found, 403 for anyone but an admin, 409 recording_in_progress. */
  async remove(input: { user: AuthUser; id: string }, now = new Date()): Promise<void> {
    const row = await this.queries.byId(input.id);
    if (!row) throw notFound('recording_not_found');
    if (input.user.role !== 'admin') throw new ForbiddenException();
    if (row.status === 'deleted') return;
    if (row.status === 'recording') throw conflict('recording_in_progress');
    await this.eraser.erase({
      id: row.id,
      filePath: row.file_path,
      actorId: input.user.id,
      now,
      audit: { action: 'delete', before: { status: row.status, visible_to_student: row.visible_to_student }, after: { status: 'deleted' } },
    });
  }
}
