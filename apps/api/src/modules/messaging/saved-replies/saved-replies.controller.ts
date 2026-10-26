import {
  savedReplyCreateSchema,
  savedReplyMoveSchema,
  savedReplyStageSchema,
  savedReplyUpdateSchema,
  savedReplyUploadSchema,
  type SavedReply,
  type SavedReplyStaged,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { assertRepliesUser, replyIdParam } from './saved-replies.guard';
import { SavedRepliesService } from './saved-replies.service';

/**
 * «الردود السريعة» (owner 2026-10-25): the admin and assistants read the shared list and keep their
 * own; writing the shared list needs saved_replies.manage (checked in the service, like
 * templates.send_all). No route sends a message: /stage only copies the attachment for the chat's
 * own POST /threads/:phone/file, which keeps every send gate.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('saved-replies')
export class SavedRepliesController {
  constructor(private readonly replies: SavedRepliesService) {}

  @Get()
  all(@CurrentUser() user: AuthUser): Promise<SavedReply[]> {
    assertRepliesUser(user);
    return this.replies.list(user);
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SavedReply> {
    assertRepliesUser(user);
    return this.replies.create(user, parseOrThrow(savedReplyCreateSchema, body));
  }

  @Post('attachment-upload-url')
  @HttpCode(201)
  uploadUrl(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    assertRepliesUser(user);
    return this.replies.uploadUrl(user, parseOrThrow(savedReplyUploadSchema, body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SavedReply> {
    assertRepliesUser(user);
    return this.replies.update(user, replyIdParam(id), parseOrThrow(savedReplyUpdateSchema, body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    assertRepliesUser(user);
    await this.replies.remove(user, replyIdParam(id));
  }

  /** Answers both lists in their new order. */
  @Post(':id/move')
  @HttpCode(200)
  move(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SavedReply[]> {
    assertRepliesUser(user);
    const { direction } = parseOrThrow(savedReplyMoveSchema, body);
    return this.replies.move(user, replyIdParam(id), direction);
  }

  @Post(':id/stage')
  @HttpCode(201)
  @Permissions('inbox.send')
  stage(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SavedReplyStaged> {
    assertRepliesUser(user);
    const { clientRequestId } = parseOrThrow(savedReplyStageSchema, body);
    return this.replies.stage(user, replyIdParam(id), clientRequestId);
  }
}
