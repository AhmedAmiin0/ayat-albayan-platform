import { usedBeforeEditSchema, type UsedBeforeEditResult, type UsedBeforeState } from '@ab/shared';
import { Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { UsedBeforeEdit } from '@/modules/finance/subscriptions';
import { UsedBeforeAccess } from './used-before-access';

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): subscriptions.edit_terms «تعديل بيانات
 * الباقة» (owner 2026-11-03), every change to an EXISTING package: the system admin, and an
 * assistant only when her role holds it (never sales by default). The create keeps
 * subscriptions.set_start_date. Teachers and families never. An assistant edits ANY student's
 * package unless «اشتراط التعيين» enforces her own (UsedBeforeAccess, SalesOwnershipRule:
 * 403 not_your_student).
 */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Permissions('subscriptions.edit_terms')
@Controller('subscriptions/:id/lessons-used-before')
export class UsedBeforeEditController {
  constructor(
    private readonly edits: UsedBeforeEdit,
    private readonly access: UsedBeforeAccess,
  ) {}

  /** 200 UsedBeforeState: the stored number, the stepper's max, a refusal (cancelled, course). */
  @Get()
  async state(
    @ZodParam('id', z.uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<UsedBeforeState> {
    await this.access.assert(id, user);
    return this.edits.state(id);
  }

  /** 200 UsedBeforeEditResult; see UsedBeforeEdit for the refusals. */
  @Patch()
  async edit(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(usedBeforeEditSchema) body: z.output<typeof usedBeforeEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<UsedBeforeEditResult> {
    await this.access.assert(id, user);
    const input = { id, lessonsUsedBefore: body.lessonsUsedBefore, actorId: user.id };
    return this.edits.edit({ ...input, now: new Date() });
  }
}
