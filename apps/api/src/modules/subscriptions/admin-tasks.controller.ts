import type { AdminTaskView } from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow, type Page } from '../teachers/http';
import { AdminTasksQueries } from './admin-tasks.queries';
import { adminTaskListQuery } from './subscriptions.dto';

/** Admin tasks raised by the R-SUB-02 alerts: renewal due, package unpaid (S7, S8). */
@ApiTags('admin-tasks')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin-tasks')
export class AdminTasksController {
  constructor(
    private readonly tasks: AdminTasksQueries,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<Page<AdminTaskView>> {
    return this.tasks.list(parseOrThrow(adminTaskListQuery, query));
  }

  @Post(':id/done')
  @HttpCode(200)
  async done(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<AdminTaskView> {
    const task = await this.tasks.done(id, user.id);
    if (!task) throw notFound('task_not_found');
    await this.audit.record({ actorId: user.id, entity: 'admin_tasks', entityId: id, action: 'done' });
    return task;
  }
}
