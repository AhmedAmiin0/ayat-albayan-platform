import { Controller, Get, Inject } from '@nestjs/common';
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
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(BackupStatusService) private readonly status: BackupStatusService) {}

  @Get()
  async view(): Promise<{ data: BackupStatusView }> {
    return { data: await this.status.view() };
  }
}
