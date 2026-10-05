import type { PublicSettings } from '@ab/shared';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { SettingsService } from './settings.service';

/**
 * GET /settings/public (no login): the registry's `public: true` settings — classroom join window,
 * makeup window, upload limit, the academy's WhatsApp — for the web, the mobile app and the public
 * pages. Served from the settings cache; browsers may keep it a minute.
 */
@ApiTags('settings')
@Public()
@Controller('settings/public')
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  get(): Promise<PublicSettings> {
    return this.settings.publicView();
  }
}
