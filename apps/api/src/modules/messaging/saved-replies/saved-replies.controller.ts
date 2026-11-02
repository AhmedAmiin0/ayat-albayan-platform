import {
  savedReplyCreateSchema,
  savedReplyMoveSchema,
  savedReplyStageSchema,
  savedReplyUpdateSchema,
  savedReplyUploadSchema,
  type SavedReply,
  type SavedReplyCreate,
  type SavedReplyMove,
  type SavedReplyStaged,
  type SavedReplyUpload,
  type SignedUpload,
} from '@ab/shared';
import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody } from '@/common/http/zod-inputs';
import { RepliesUserGuard, replyIdParam } from './saved-replies.guard';
import { SavedRepliesService } from './saved-replies.service';

type StageBody = z.output<typeof savedReplyStageSchema>;

/**
 * «الردود السريعة» (owner 2026-10-25): the admin and assistants read the shared list and keep their
 * own (RepliesUserGuard, before any body is parsed); writing the shared list needs
 * saved_replies.manage (checked in the service, like templates.send_all). No route sends a message:
 * /stage only copies the attachment for the chat's own POST /threads/:phone/file, which keeps
 * every send gate.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@UseGuards(RepliesUserGuard)
@Controller('saved-replies')
export class SavedRepliesController {
  constructor(private readonly replies: SavedRepliesService) {}

  @Get()
  all(@CurrentUser() user: AuthUser): Promise<SavedReply[]> {
    return this.replies.list(user);
  }

  @Post()
  @HttpCode(201)
  create(
    @ZodBody(savedReplyCreateSchema) body: SavedReplyCreate,
    @CurrentUser() user: AuthUser,
  ): Promise<SavedReply> {
    return this.replies.create(user, body);
  }

  @Post('attachment-upload-url')
  @HttpCode(201)
  uploadUrl(
    @ZodBody(savedReplyUploadSchema) body: SavedReplyUpload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.replies.uploadUrl(user, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SavedReply> {
    // A bad :id (404) still wins over a bad body: parsed inline until z2a's ZodParam.
    const reply = replyIdParam(id);
    return this.replies.update(user, reply, parseOrThrow(savedReplyUpdateSchema, body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.replies.remove(user, replyIdParam(id));
  }

  /** Answers both lists in their new order. */
  @Post(':id/move')
  @HttpCode(200)
  move(
    @Param('id') id: string,
    @ZodBody(savedReplyMoveSchema) body: SavedReplyMove,
    @CurrentUser() user: AuthUser,
  ): Promise<SavedReply[]> {
    return this.replies.move(user, replyIdParam(id), body.direction);
  }

  @Post(':id/stage')
  @HttpCode(201)
  @Permissions('inbox.send')
  stage(
    @Param('id') id: string,
    @ZodBody(savedReplyStageSchema) body: StageBody,
    @CurrentUser() user: AuthUser,
  ): Promise<SavedReplyStaged> {
    return this.replies.stage(user, replyIdParam(id), body.clientRequestId);
  }
}
