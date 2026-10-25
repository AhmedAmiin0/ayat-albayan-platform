import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { GoogleConnection } from './oauth/google-connection';
import { GoogleSyncJob } from './sync/google-sync.job';

/** What an admin action touches besides data: the client cache, the worker, the audit log. */
@Injectable()
export class GoogleRuntime {
  constructor(
    readonly connection: GoogleConnection,
    readonly job: GoogleSyncJob,
    readonly audit: AuditService,
  ) {}
}
