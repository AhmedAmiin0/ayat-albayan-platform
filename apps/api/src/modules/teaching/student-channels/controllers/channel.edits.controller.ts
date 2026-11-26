import { channelEditSchema, type ChannelEdit, type ChannelMessageView } from '@ab/shared';
import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody, ZodParams } from '@/common/http/zod-inputs';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelEdits } from '@/modules/teaching/student-channels/channel-edits.service';
import { messageParams } from './channel-message-params';
import { isAdmin } from '@/common/auth/roles';

type Params = Record<string, string | undefined>;
const TEACHER = 'teachers/me/channels/:studentId/messages/:messageId';
const PORTAL = 'portal/students/:id/channel/messages/:messageId';
const SALES = 'sales/students/:id/channel/messages/:messageId';
const salesIds = z.object({ id: z.uuid(), messageId: z.uuid() });
type SalesIds = z.output<typeof salesIds>;

/** Edit and delete for everyone: sender limits 15 min and 48 h; the admin deletes via monitor. */
@ApiTags('student-channels')
@ApiBearerAuth()
@Controller()
export class ChannelEditsController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly edits: ChannelEdits,
  ) {}

  @Patch(TEACHER)
  @Permissions('self.teacher')
  async teacherEdit(@Param() p: Params, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { studentId, messageId } = await messageParams(p, 'studentId');
    const actor = await this.access.teacher(user, studentId);
    return this.edits.edit({ actor, messageId, body: textOf(body) });
  }

  @Delete(TEACHER)
  @Permissions('self.teacher')
  async teacherDelete(@Param() p: Params, @CurrentUser() user: AuthUser) {
    const { studentId, messageId } = await messageParams(p, 'studentId');
    return this.edits.remove({ actor: await this.access.teacher(user, studentId), messageId });
  }

  @Patch(PORTAL)
  @Permissions('self.portal')
  async familyEdit(@Param() p: Params, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { studentId, messageId } = await messageParams(p, 'id');
    const actor = await this.access.family(user, studentId);
    return this.edits.edit({ actor, messageId, body: textOf(body) });
  }

  @Delete(PORTAL)
  @Permissions('self.portal')
  async familyDelete(@Param() p: Params, @CurrentUser() user: AuthUser) {
    const { studentId, messageId } = await messageParams(p, 'id');
    return this.edits.remove({ actor: await this.access.family(user, studentId), messageId });
  }

  @Patch(SALES)
  @Permissions('self.sales')
  async salesEdit(
    @ZodParams(salesIds) p: SalesIds,
    @ZodBody(channelEditSchema) body: ChannelEdit,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.assistant(user, p.id);
    return this.edits.edit({ actor, messageId: p.messageId, body: body.body });
  }

  @Delete(SALES)
  @Permissions('self.sales')
  async salesDelete(@ZodParams(salesIds) p: SalesIds, @CurrentUser() user: AuthUser) {
    const actor = await this.access.assistant(user, p.id);
    return this.edits.remove({ actor, messageId: p.messageId });
  }

  /** Moderation: the admin only (another holder of student_channels.monitor is 403). */
  @Delete('students/:id/channel/messages/:messageId')
  @Permissions('student_channels.monitor')
  async moderate(@Param() p: Params, @CurrentUser() user: AuthUser): Promise<ChannelMessageView> {
    if (!isAdmin(user)) throw forbidden('moderation_admin_only');
    const { studentId, messageId } = await messageParams(p, 'id');
    const actor = await this.access.monitor(user, studentId);
    return this.edits.remove({ actor, messageId, moderator: true });
  }
}

const textOf = (body: unknown): string => parseOrThrow(channelEditSchema, body).body;
