import { usedBeforeEditSchema, type UsedBeforeEditResult, type UsedBeforeState } from '@ab/shared';
import { Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { UsedBeforeEdit } from './used-before-edit.service';

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): subscriptions.edit_terms «تعديل بيانات
 * الباقة» (owner 2026-11-03), every change to an EXISTING package: the system admin, and an
 * assistant only when her role holds it (never sales by default). The create keeps
 * subscriptions.set_start_date. ANY student; teachers and families never.
 */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Permissions('subscriptions.edit_terms')
@Controller('subscriptions/:id/lessons-used-before')
export class UsedBeforeEditController {
  constructor(private readonly edits: UsedBeforeEdit) {}

  /** 200 UsedBeforeState: the stored number, the stepper's max, a refusal (cancelled, course). */
  @Get()
  state(@ZodParam('id', z.uuid()) id: string): Promise<UsedBeforeState> {
    return this.edits.state(id);
  }

  /** 200 UsedBeforeEditResult; see UsedBeforeEdit for the refusals. */
  @Patch()
  edit(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(usedBeforeEditSchema) body: z.output<typeof usedBeforeEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<UsedBeforeEditResult> {
    const input = { id, lessonsUsedBefore: body.lessonsUsedBefore, actorId: user.id };
    return this.edits.edit({ ...input, now: new Date() });
  }
}
