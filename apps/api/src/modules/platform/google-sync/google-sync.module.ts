import { Module } from '@nestjs/common';
import { GoogleAdminModule } from '@/modules/platform/google-sync/admin';
import { GoogleMapModule } from '@/modules/platform/google-sync/map';
import { GoogleOAuthModule } from '@/modules/platform/google-sync/oauth';
import { GoogleSyncCoreModule } from '@/modules/platform/google-sync/sync';

/** One way only, platform to Google (docs/24); default off and dry_run; env read at call time. */
@Module({
  imports: [GoogleSyncCoreModule, GoogleAdminModule, GoogleMapModule, GoogleOAuthModule],
  // The MinIO → Drive backup (docs/45 §5) reuses the connection: its token, invalid_grant handling.
  exports: [GoogleSyncCoreModule],
})
export class GoogleSyncModule {}
