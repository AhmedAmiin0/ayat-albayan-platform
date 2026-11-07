import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { BackupStatusService } from './backup-status.service';
import type { BackupStatusView } from './backup-view';

/** Under «التخزين» in «التكاملات» (docs/45 §5): same permission as the storage probe. */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('settings/integrations/storage-backup')
export class BackupStatusController {
  constructor(private readonly status: BackupStatusService) {}

  @Get()
  async view(): Promise<{ data: BackupStatusView }> {
    return { data: await this.status.view() };
  }
}
