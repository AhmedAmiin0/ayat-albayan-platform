import { publicCustom, type PublicConfig } from '@ab/shared';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { CustomConfigService } from '@/common/configuration/custom-config/custom-config.service';
import { SettingsService } from '@/common/settings/settings.service';

/**
 * GET /settings/public (no login): the registry's `public: true` settings — classroom join window,
 * makeup window, upload limit, the academy's WhatsApp, contact, consent notice — plus `custom`, the
 * custom entries an admin flagged public (readable by anyone). For the web, the mobile app and the
 * public pages. Browsers may keep it a minute.
 */
@ApiTags('settings')
@Public()
@Controller('settings/public')
export class PublicConfigController {
  constructor(
    private readonly settings: SettingsService,
    private readonly custom: CustomConfigService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async get(): Promise<PublicConfig> {
    return { ...(await this.settings.publicView()), custom: publicCustom(await this.custom.publicRows()) };
  }
}
