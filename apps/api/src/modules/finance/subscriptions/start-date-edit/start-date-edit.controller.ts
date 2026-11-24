import { startDateEditSchema, type StartDateEditResult } from '@ab/shared';
import { Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { StartDateEdit } from './start-date-edit.service';

/** Needs subscriptions.edit_terms (not set_start_date alone); never teachers or families. */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Permissions('subscriptions.edit_terms')
@Controller('subscriptions/:id/start-date')
export class StartDateEditController {
  constructor(private readonly edits: StartDateEdit) {}

  /** 200 StartDateEditResult; see StartDateEdit for the refusals. */
  @Patch()
  edit(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(startDateEditSchema) body: z.output<typeof startDateEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<StartDateEditResult> {
    return this.edits.edit({ id, startsOn: body.startsOn, actorId: user.id, now: new Date() });
  }
}
