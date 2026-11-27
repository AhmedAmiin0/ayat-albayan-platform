import { publicConfigRoutes as routes, publicCustom, type PublicConfig } from '@ab/settings';
import { Controller, Header } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { CustomConfigService } from '@/common/configuration/custom-config/custom-config.service';
import { Route } from '@/common/http/route';
import { SettingsService } from '@/common/settings/settings.service';

/**
 * GET /settings/public (no login): the registry's `public: true` settings — classroom join window,
 * makeup window, upload limit, the academy's WhatsApp, contact, consent notice — plus `custom`, the
 * custom entries an admin flagged public (readable by anyone). For the web, the mobile app and the
 * public pages. Browsers may keep it a minute. The answer is not passed through the route's schema:
 * that schema is the apps' lenient read, which fills defaults (docs/36 Z-5).
 */
@Controller()
export class PublicConfigController {
  constructor(
    private readonly settings: SettingsService,
    private readonly custom: CustomConfigService,
  ) {}

  @Public()
  @Route(routes.get)
  @Header('Cache-Control', 'public, max-age=60')
  async get(): Promise<PublicConfig> {
    return {
      ...(await this.settings.publicView()),
      custom: publicCustom(await this.custom.publicRows()),
    };
  }
}
