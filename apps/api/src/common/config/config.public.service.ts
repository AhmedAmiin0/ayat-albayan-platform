import { buildPublicConfig, type PublicConfig } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { CustomConfigService } from './custom-config.service';

/** What GET /config serves: the registry's public settings and custom entries flagged public, nothing else. */
@Injectable()
export class PublicConfigService {
  constructor(
    private readonly settings: SettingsService,
    private readonly custom: CustomConfigService,
  ) {}

  async read(): Promise<PublicConfig> {
    return buildPublicConfig(await this.settings.all(), await this.custom.publicRows());
  }
}
