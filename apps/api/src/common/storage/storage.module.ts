import { Global, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { loadEnv } from '@/config/env/env';
import { egressKeyWarning, storageEnv } from '@/config/env/env.storage';
import { UploadClientInterceptor } from './slots/upload-client.interceptor';
import { StorageService } from './storage.service';

/** Global: reports, the PDF job and payments inject StorageService; X-AB-Upload on every route. */
@Global()
@Module({
  providers: [StorageService, { provide: APP_INTERCEPTOR, useClass: UploadClientInterceptor }],
  exports: [StorageService],
})
export class StorageModule implements OnApplicationBootstrap {
  /** Once at boot: the egress still signs with the app key (docs/45 §1a). Key names only. */
  onApplicationBootstrap(): void {
    const warning = egressKeyWarning(storageEnv(loadEnv()));
    if (warning) new Logger(StorageModule.name).warn(warning);
  }
}
