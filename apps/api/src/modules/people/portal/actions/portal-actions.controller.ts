import {
  portalCancelSchema,
  portalRequestSchema,
  portalSlotsQuerySchema,
  type PortalActionResult,
  type PortalCancel,
  type PortalRequest,
  type PortalSlots,
  type PortalSlotsQuery,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParams, ZodQuery } from '@/common/http/zod-inputs';
import { PortalLessonActions } from './portal-actions.service';
import { PortalSlotsService } from './portal-slots.service';

const ids = z.object({ id: z.uuid(), lessonId: z.uuid() });
type Ids = z.infer<typeof ids>;

const call = (p: Ids, user: AuthUser) => ({ user, studentId: p.id, lessonId: p.lessonId });

/** Lesson actions on the login's own student, scoped like PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal/students/:id/lessons/:lessonId')
export class PortalLessonActionsController {
  constructor(
    @Inject(PortalLessonActions) private readonly actions: PortalLessonActions,
    @Inject(PortalSlotsService) private readonly slots: PortalSlotsService,
  ) {}

  @Post('confirm')
  @HttpCode(200)
  confirm(@ZodParams(ids) p: Ids, @CurrentUser() user: AuthUser): Promise<PortalActionResult> {
    return this.actions.confirm(call(p, user));
  }

  /** The answer's `counts`: whether the cancelled lesson counts from the package. */
  @Post('cancel')
  @HttpCode(200)
  cancel(
    @ZodParams(ids) p: Ids,
    @ZodBody(portalCancelSchema, { orEmpty: true }) body: PortalCancel,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.cancel(call(p, user), body);
  }

  /** 409 proposal_pending (one waiting request per lesson), 400 date_in_past. */
  @Post('request')
  @HttpCode(200)
  request(
    @ZodParams(ids) p: Ids,
    @ZodBody(portalRequestSchema) body: PortalRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.request(call(p, user), body);
  }

  /** 409 no_request when nothing waits. */
  @Post('withdraw')
  @HttpCode(200)
  withdraw(@ZodParams(ids) p: Ids, @CurrentUser() user: AuthUser): Promise<PortalActionResult> {
    return this.actions.withdraw(call(p, user));
  }

  @Get('slots')
  free(
    @ZodParams(ids) p: Ids,
    @ZodQuery(portalSlotsQuerySchema) q: PortalSlotsQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalSlots> {
    return this.slots.free(call(p, user), q);
  }
}
