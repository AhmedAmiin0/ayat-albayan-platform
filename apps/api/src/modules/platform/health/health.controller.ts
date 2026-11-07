import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { StorageHealth, type StorageHealthView } from '@/common/storage/probe';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly storage: StorageHealth) {}

  /**
   * Liveness probe (R-NFR-07), always 200 while the process serves: the load balancer and Docker
   * read it. `storage` reports the store new files go to (docs/45): «down» is for the owner to see,
   * never a reason to take a copy out of the balancer.
   */
  @Public()
  @Get()
  async check(): Promise<{ status: 'ok'; storage: StorageHealthView }> {
    return { status: 'ok', storage: await this.storage.view() };
  }
}
