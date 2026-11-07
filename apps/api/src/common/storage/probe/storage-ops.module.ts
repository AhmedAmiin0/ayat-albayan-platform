import { Module } from '@nestjs/common';
import { StorageModule } from '@/common/storage/storage.module';
import { StorageHealth } from './storage-health';
import { StorageProbe } from './storage-probe';
import { StorageProbeController } from './storage-probe.controller';

/** StorageService (global) plus its admin probe and its /health view (docs/45). */
@Module({
  imports: [StorageModule],
  controllers: [StorageProbeController],
  providers: [StorageProbe, StorageHealth],
  exports: [StorageHealth],
})
export class StorageOpsModule {}
