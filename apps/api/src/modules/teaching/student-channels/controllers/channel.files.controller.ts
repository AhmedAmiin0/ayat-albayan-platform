import {
  channelUploadSchema,
  type ChannelReads,
  type ChannelUpload,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam, ZodParams } from '@/common/http/zod-inputs';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelMedia } from '@/modules/teaching/student-channels/media/channel-media.service';
import { ChannelReadsService } from '@/modules/teaching/student-channels/reads/channel-reads.service';

const id = z.uuid();
const teacherIds = z.object({ studentId: z.uuid(), messageId: z.uuid() });
const studentIds = z.object({ id: z.uuid(), messageId: z.uuid() });
type TeacherIds = z.output<typeof teacherIds>;
type StudentIds = z.output<typeof studentIds>;
const READS = 'messages/:messageId/reads';
const UPLOAD = 'attachments/upload-url';

/** Chat upgrade (docs/31 §2): participants upload media; anyone let in sees message read info. */
@ApiTags('student-channels')
@ApiBearerAuth()
@Controller()
export class ChannelFilesController {
  constructor(
    @Inject(ChannelAccess) private readonly access: ChannelAccess,
    @Inject(ChannelMedia) private readonly media: ChannelMedia,
    @Inject(ChannelReadsService) private readonly reads: ChannelReadsService,
  ) {}

  @Post(`teachers/me/channels/:studentId/${UPLOAD}`)
  @Permissions('self.teacher')
  async teacherUpload(
    @ZodParam('studentId', id) studentId: string,
    @ZodBody(channelUploadSchema) file: ChannelUpload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.teacher(user, studentId), file);
  }

  @Post(`portal/students/:id/channel/${UPLOAD}`)
  @Permissions('self.portal')
  async familyUpload(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelUploadSchema) file: ChannelUpload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.family(user, studentId), file);
  }

  @Post(`sales/students/:id/channel/${UPLOAD}`)
  @Permissions('self.sales')
  async salesUpload(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelUploadSchema) file: ChannelUpload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.assistant(user, studentId), file);
  }

  @Get(`teachers/me/channels/:studentId/${READS}`)
  @Permissions('self.teacher')
  async teacherReads(
    @ZodParams(teacherIds) p: TeacherIds,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.teacher(user, p.studentId), p.messageId);
  }

  @Get(`portal/students/:id/channel/${READS}`)
  @Permissions('self.portal')
  async familyReads(
    @ZodParams(studentIds) p: StudentIds,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.family(user, p.id), p.messageId);
  }

  @Get(`sales/students/:id/channel/${READS}`)
  @Permissions('self.sales')
  async salesReads(
    @ZodParams(studentIds) p: StudentIds,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.assistant(user, p.id), p.messageId);
  }

  @Get(`students/:id/channel/${READS}`)
  @Permissions('student_channels.monitor')
  async monitorReads(
    @ZodParams(studentIds) p: StudentIds,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.monitor(user, p.id), p.messageId);
  }
}
