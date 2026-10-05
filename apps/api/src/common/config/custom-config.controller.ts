import { customConfigUpsertSchema, customKeySchema, type CustomConfigView } from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '../../modules/teachers/http';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { CustomConfigService } from './custom-config.service';

/** audit_log.entity_id of the custom entries (the key is not a uuid; it is in before/after). */
const CUSTOM_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

/** Admin CRUD of the free-form entries. Every change is audited with the old and new value. */
@ApiTags('config')
@ApiBearerAuth()
@Roles('admin')
@Controller('config/custom')
export class CustomConfigController {
  constructor(
    private readonly custom: CustomConfigService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<CustomConfigView[]> {
    return this.custom.list();
  }

  /** 400 on a bad key (or one reserved by a registry setting), a null or a value over 8 KB. */
  @Put(':key')
  async put(@Param('key') rawKey: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CustomConfigView> {
    const key = parseOrThrow(customKeySchema, rawKey);
    const input = parseOrThrow(customConfigUpsertSchema, body);
    const before = await this.custom.find(key);
    const after = await this.custom.upsert(key, input, user.id);
    await this.audit.record({
      actorId: user.id,
      entity: 'custom_config',
      entityId: CUSTOM_ENTITY_ID,
      action: before ? 'update' : 'create',
      before: before ? { ...before } : null,
      after: { ...after },
    });
    return after;
  }

  @Delete(':key')
  @HttpCode(204)
  async remove(@Param('key') rawKey: string, @CurrentUser() user: AuthUser): Promise<void> {
    const key = parseOrThrow(customKeySchema, rawKey);
    const before = await this.custom.find(key);
    if (!before || !(await this.custom.remove(key))) throw new NotFoundException({ code: 'not_found', message: 'not_found' });
    await this.audit.record({
      actorId: user.id,
      entity: 'custom_config',
      entityId: CUSTOM_ENTITY_ID,
      action: 'delete',
      before: { ...before },
      after: null,
    });
  }
}
