import { integrationRoutes as routes, type StorageProbeResult } from '@ab/catalog';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route } from '@/common/http/route';
import { StorageProbe } from './storage-probe';

/** Same permission as saving an integration (docs/45); the probe object is deleted after. */
@ApiBearerAuth()
@Controller()
export class StorageProbeController {
  constructor(private readonly probe: StorageProbe) {}

  @Route(routes.storageProbe)
  @HttpCode(200)
  async run(): Promise<{ data: StorageProbeResult }> {
    return { data: await this.probe.run() };
  }
}
