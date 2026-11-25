import {
  configDescriptionSchema,
  configEntryPatchSchema,
  type ConfigEntriesResponse,
  type ConfigEntryResult,
} from '@ab/settings';
import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '@/common/http/http';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ConfigEntriesService } from './config-entries.service';

/** Settings values (docs/26 §2f): per-key versioned saves; Google rows are base-admin only. */
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

  /**
   * `{text | null}`; null = restore the seeded text (and drop the ar override). Audited
   * `describe:<key>`.
   */
  @Put(':key/description')
  @Permissions('settings.write')
  describe(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ConfigEntryResult> {
    return this.entries.describe({ key, body: parseOrThrow(configDescriptionSchema, body), user });
  }
}
