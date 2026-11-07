import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UploadClientInterceptor } from './slots/upload-client.interceptor';
import { StorageService } from './storage.service';

/** Global: reports, the PDF job and payments inject StorageService; X-AB-Upload on every route. */
@Global()
@Module({
  providers: [StorageService, { provide: APP_INTERCEPTOR, useClass: UploadClientInterceptor }],
  exports: [StorageService],
})
export class StorageModule {}
