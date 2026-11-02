import { usedBeforeEditSchema, type UsedBeforeEditResult } from '@ab/shared';
import { Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { UsedBeforeEdit } from './used-before-edit.service';

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): subscriptions.set_start_date, the key
 * that already gates «حلقات مستخدمة من الباقة» on the create (system admin and sales by
 * default, migration 430), so no new key and no migration. ANY student; teachers and
 * families never.
 */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Permissions('subscriptions.set_start_date')
@Controller('subscriptions/:id/lessons-used-before')
export class UsedBeforeEditController {
  constructor(private readonly edits: UsedBeforeEdit) {}

  /** 200 UsedBeforeEditResult; see UsedBeforeEdit for the refusals. */
  @Patch()
  edit(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(usedBeforeEditSchema) body: z.output<typeof usedBeforeEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<UsedBeforeEditResult> {
    return this.edits.edit({ id, lessonsUsedBefore: body.lessonsUsedBefore, actorId: user.id });
  }
}
