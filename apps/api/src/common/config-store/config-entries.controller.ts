import {
  configDescriptionSchema,
  configEntryPatchSchema,
  type ConfigEntriesResponse,
  type ConfigEntryResult,
} from '@ab/shared';
import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '../../modules/teachers/http';
import { CurrentUser, Permissions } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { ConfigEntriesService } from './config-entries.service';

/**
 * «القيم» (docs/26 §2f): every settings row merged with its code entry, saved one key at a time with
 * an expected version, and the admins' Arabic description of each row. No new permission: settings.read
 * / settings.write; Google rows are base-admin only, owned keys are edited on their module page.
 */
@ApiTags('config')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('config/entries')
export class ConfigEntriesController {
  constructor(private readonly entries: ConfigEntriesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ConfigEntriesResponse> {
    return { entries: await this.entries.list(user) };
  }

  /** `{value, expectedVersion, confirmText?}`; value null stores JSON null (= the default). */
  @Patch(':key')
  @Permissions('settings.write')
  update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ConfigEntryResult> {
    return this.entries.patch({ key, body: parseOrThrow(configEntryPatchSchema, body), user });
  }

  /** `{text | null}`; null = restore the seeded text (and drop the ar override). Audited `describe:<key>`. */
  @Put(':key/description')
  @Permissions('settings.write')
  describe(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ConfigEntryResult> {
    return this.entries.describe({ key, body: parseOrThrow(configDescriptionSchema, body), user });
  }
}
