import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { StorageProbe, type StorageProbeResult } from './storage-probe';

/**
 * «اختبار الاتصال» under «التخزين» in «التكاملات» (docs/45): same permission as saving an
 * integration. Writes nothing the admin sees: a probe object is put, read back and deleted.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('settings/integrations/storage-probe')
export class StorageProbeController {
  constructor(private readonly probe: StorageProbe) {}

  @Post()
  @HttpCode(200)
  async run(): Promise<{ data: StorageProbeResult }> {
    return { data: await this.probe.run() };
  }
}
