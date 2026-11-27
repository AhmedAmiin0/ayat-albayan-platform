import { backupRoutes as routes, type BackupStatusView } from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { BackupStatusService } from './backup-status.service';

@ApiBearerAuth()
@Controller()
export class BackupStatusController {
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(BackupStatusService) private readonly status: BackupStatusService) {}

  @Route(routes.status)
  async view(): Promise<{ data: BackupStatusView }> {
    return asResponse(routes.status.response, { data: await this.status.view() });
  }
}
