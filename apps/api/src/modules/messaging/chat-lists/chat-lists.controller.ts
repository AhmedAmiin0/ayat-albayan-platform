import { chatListBodySchema, type ChatList, type ChatListBody } from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import {
  ListsUserGuard,
  listIdSchema,
  listInvalidPhone,
  listNotFound,
  listPhoneSchema,
} from './chat-lists.guard';
import { ChatListsService } from './chat-lists.service';

/**
 * «القوائم» (owner 2026-10-20, docs/22 §3): the academy's shared chat lists, for the admin and the
 * assistants with inbox.lists (+ inbox.read); a teacher is 403 (ListsUserGuard, before any body
 * is parsed). A list only organises chats: no route here sends anything.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.lists')
@UseGuards(ListsUserGuard)
@Controller('chat-lists')
export class ChatListsController {
  constructor(private readonly lists: ChatListsService) {}

  @Get()
  all(): Promise<ChatList[]> {
    return this.lists.all();
  }

  @Post()
  @HttpCode(201)
  create(
    @ZodBody(chatListBodySchema) body: ChatListBody,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatList> {
    return this.lists.create(body.name, user.id);
  }

  @Patch(':id')
  rename(
    @ZodParam('id', listIdSchema, listNotFound) id: string,
    @ZodBody(chatListBodySchema) body: ChatListBody,
  ): Promise<ChatList> {
    return this.lists.rename(id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@ZodParam('id', listIdSchema, listNotFound) id: string): Promise<void> {
    await this.lists.remove(id);
  }

  // `id` comes after `phone` on purpose: Nest runs the later param's pipe first, so a bad id (404)
  // still wins over a bad phone (400), as when the handler checked the id first.
  @Put(':id/threads/:phone')
  @HttpCode(204)
  async add(
    @ZodParam('phone', listPhoneSchema, listInvalidPhone) phone: string,
    @ZodParam('id', listIdSchema, listNotFound) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.lists.add({ listId: id, phone, by: user.id });
  }

  @Delete(':id/threads/:phone')
  @HttpCode(204)
  async drop(
    @ZodParam('phone', listPhoneSchema, listInvalidPhone) phone: string,
    @ZodParam('id', listIdSchema, listNotFound) id: string,
  ): Promise<void> {
    await this.lists.drop(id, phone);
  }
}
