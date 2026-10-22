import type { GoogleSyncItemView } from '@ab/shared';
import { ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { requireAdmin } from './admin-only';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleLogQueries } from './google-log.queries';
import { GoogleSyncJob } from './google-sync.job';

/** The sync log, «إعادة المحاولة» and «زامن الآن» (docs/24 §3). */
@ApiTags('google-sync')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('admin/google')
export class GoogleItemsController {
  constructor(
    private readonly log: GoogleLogQueries,
    private readonly items: GoogleItemsQueries,
    private readonly job: GoogleSyncJob,
  ) {}

  @Get('items')
  @Permissions('settings.read')
  list(@CurrentUser() user: AuthUser): Promise<GoogleSyncItemView[]> {
    requireAdmin(user);
    return this.log.recent(100);
  }

  @Post('items/:id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<GoogleSyncItemView> {
    requireAdmin(user);
    if (!(await this.items.retry(id))) throw new ConflictException({ message: 'not_retryable' });
    void this.job.kick();
    const row = await this.log.one(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Post('reconcile')
  async reconcile(@CurrentUser() user: AuthUser): Promise<{ queued: number }> {
    requireAdmin(user);
    return { queued: await this.job.reconcile() };
  }
}
