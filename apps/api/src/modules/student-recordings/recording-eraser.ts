import type { Json } from '@ab/db';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { BUCKETS } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { RecordingAdminQueries } from './recording-admin.queries';

export interface EraseInput {
  id: string;
  filePath: string;
  /** The admin; null for the retention job. */
  actorId: string | null;
  now: Date;
  audit: { action: string; before?: Json; after: Json };
}

/**
 * Deletes one recording: the file first (a failure leaves the row and no audit row, so a retry
 * finds it again), then the row becomes `deleted` and an audit row says who and why.
 * Shared by the admin's DELETE and the retention job.
 */
@Injectable()
export class RecordingEraser {
  constructor(
    private readonly queries: RecordingAdminQueries,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async erase(input: EraseInput): Promise<void> {
    await this.storage.remove({ bucket: BUCKETS.recordings, path: input.filePath });
    await this.queries.markDeleted(input.id, input.now.toISOString());
    await this.audit.record({ actorId: input.actorId, entity: 'lesson_recordings', entityId: input.id, ...input.audit });
  }
}
