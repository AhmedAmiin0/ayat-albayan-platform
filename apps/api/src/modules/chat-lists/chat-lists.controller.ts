import { chatListBodySchema, type ChatList } from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { assertListsUser, listIdParam, listPhoneParam } from './chat-lists.guard';
import { ChatListsService } from './chat-lists.service';

/**
 * «القوائم» (owner 2026-10-20, docs/22 §3): the academy's shared chat lists, for the admin and the
 * assistants with inbox.lists (+ inbox.read); a teacher is 403. A list only organises chats: no
 * route here sends anything.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.lists')
@Controller('chat-lists')
export class ChatListsController {
  constructor(private readonly lists: ChatListsService) {}

  @Get()
  all(@CurrentUser() user: AuthUser): Promise<ChatList[]> {
    assertListsUser(user);
    return this.lists.all();
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ChatList> {
    assertListsUser(user);
    return this.lists.create(parseOrThrow(chatListBodySchema, body).name, user.id);
  }

  @Patch(':id')
  rename(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ChatList> {
    assertListsUser(user);
    const { name } = parseOrThrow(chatListBodySchema, body);
    return this.lists.rename(listIdParam(id), name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    assertListsUser(user);
    await this.lists.remove(listIdParam(id));
  }

  @Put(':id/threads/:phone')
  @HttpCode(204)
  async add(@Param('id') id: string, @Param('phone') phone: string, @CurrentUser() user: AuthUser): Promise<void> {
    assertListsUser(user);
    await this.lists.add({ listId: listIdParam(id), phone: listPhoneParam(phone), by: user.id });
  }

  @Delete(':id/threads/:phone')
  @HttpCode(204)
  async drop(@Param('id') id: string, @Param('phone') phone: string, @CurrentUser() user: AuthUser): Promise<void> {
    assertListsUser(user);
    await this.lists.drop(listIdParam(id), listPhoneParam(phone));
  }
}
