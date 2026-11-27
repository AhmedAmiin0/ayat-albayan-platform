import type { Page } from '@ab/core';
import type { AdminTaskView } from '@ab/money';
import { adminTaskRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AdminTasksRepo } from './admin-tasks.repo';

/** Admin tasks raised by the R-SUB-02 alerts: renewal due, package unpaid (S7, S8). */
@ApiBearerAuth()
@Controller()
export class AdminTasksController {
  constructor(
    private readonly tasks: AdminTasksRepo,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<Page<AdminTaskView>> {
    return this.tasks.list(query);
  }

  @Route(routes.done)
  @HttpCode(200)
  async done(
    @RouteInput() { params }: RouteInputOf<typeof routes.done>,
    @CurrentUser() user: AuthUser,
  ): Promise<AdminTaskView> {
    const { id } = params;
    const task = await this.tasks.done(id, user.id);
    if (!task) throw notFound('task_not_found');
    await this.audit.record({ actorId: user.id, entity: 'admin_tasks', entityId: id, action: 'done' });
    return task;
  }
}
