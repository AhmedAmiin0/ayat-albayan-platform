import { Module } from '@nestjs/common';
import { GoogleOAuthModule } from '@/modules/platform/google-sync/oauth';
import { GoogleSyncCoreModule } from '@/modules/platform/google-sync/sync';
import { GoogleAdminController } from './google-admin.controller';
import { GoogleAdminService } from './google-admin.service';
import { GoogleItemsController } from './google-items.controller';
import { GoogleLogQueries } from './google-log.queries';
import { GoogleStatusService } from './google-status.service';

@Module({
  imports: [GoogleSyncCoreModule, GoogleOAuthModule],
  controllers: [GoogleAdminController, GoogleItemsController],
  providers: [GoogleAdminService, GoogleLogQueries, GoogleStatusService],
})
export class GoogleAdminModule {}
