import { customConfigRoutes as routes, type CustomConfigView } from '@ab/settings';
import { Controller, HttpCode, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AuditService } from '@/common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '@/common/audit/singleton-entity';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { CustomConfigService } from './custom-config.service';

/** Admin CRUD of the free-form entries. Every change is audited with the old and new value. */
@ApiBearerAuth()
@Controller()
export class CustomConfigController {
  constructor(
    private readonly custom: CustomConfigService,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.list)
  async list(): Promise<CustomConfigView[]> {
    return asResponse(routes.list.response, await this.custom.list());
  }

  /** 400 on a bad key (or one reserved by a registry setting), a null or a value over 8 KB. */
  @Route(routes.put)
  async put(
    @RouteInput({ paramsFirst: true })
    { params: { key }, body: input }: RouteInputOf<typeof routes.put>,
    @CurrentUser() user: AuthUser,
  ): Promise<CustomConfigView> {
    const before = await this.custom.find(key);
    const after = await this.custom.upsert(key, input, user.id);
    await this.audit.record({
      actorId: user.id,
      entity: 'custom_config',
      entityId: SINGLETON_ENTITY_ID,
      action: `${before ? 'update' : 'create'}:${key}`,
      before: before ? { ...before } : null,
      after: { ...after },
    });
    return after;
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(
    @RouteInput() { params: { key } }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const before = await this.custom.find(key);
    if (!before || !(await this.custom.remove(key)))
      throw new NotFoundException({ code: 'not_found', message: 'not_found' });
    await this.audit.record({
      actorId: user.id,
      entity: 'custom_config',
      entityId: SINGLETON_ENTITY_ID,
      action: `delete:${key}`,
      before: { ...before },
      after: null,
    });
  }
}
