import { Module } from '@nestjs/common';
import { GoogleSyncCoreModule } from '@/modules/platform/google-sync/sync';
import { GoogleCallbackController } from './google-callback.controller';
import { GoogleOAuthService } from './google-oauth.service';

/** Google's OAuth redirect lands here; the admin routes reuse the service to start the flow. */
@Module({
  imports: [GoogleSyncCoreModule],
  controllers: [GoogleCallbackController],
  providers: [GoogleOAuthService],
  exports: [GoogleOAuthService],
})
export class GoogleOAuthModule {}
