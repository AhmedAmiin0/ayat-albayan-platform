import type { Json } from '@ab/db';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { BUCKETS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { RecordingAdminQueries } from '../recording-admin.queries';

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
 * finds it again), then the row becomes `deleted`; only the call that actually changed the row
 * writes the audit row (who and why). The file is gone by then, so a failing audit insert is
 * logged and the delete still succeeds. Shared by the admin's DELETE and the retention job.
 */
@Injectable()
export class RecordingEraser {
  private readonly log = new Logger(RecordingEraser.name);

  constructor(
    private readonly queries: RecordingAdminQueries,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** true when this call deleted the recording, false when another call already had. */
  async erase(input: EraseInput): Promise<boolean> {
    await this.storage.remove({ bucket: BUCKETS.recordings, path: input.filePath });
    if ((await this.queries.markDeleted(input.id, input.now.toISOString())) !== 1) return false;
    try {
      await this.audit.record({ actorId: input.actorId, entity: 'lesson_recordings', entityId: input.id, ...input.audit });
    } catch (e) {
      this.log.error(`recording ${input.id} deleted but its audit row failed: ${String(e)}`);
    }
    return true;
  }
}
