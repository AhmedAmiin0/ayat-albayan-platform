import { chatListRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ListsUserGuard, listInvalidPhone, listNotFound } from './chat-lists.guard';
import { ChatListsService } from './chat-lists.service';

const byId = { badParam: listNotFound };
// A bad id (404) wins over a bad phone (400 invalid_phone).
const byIdThenPhone = {
  paramErrors: [
    { name: 'id', fail: listNotFound },
    { name: 'phone', fail: listInvalidPhone },
  ],
};

/** Shared chat lists (docs/22 §3); teachers get 403; nothing here sends. */
@ApiBearerAuth()
@UseGuards(ListsUserGuard)
@Controller()
export class ChatListsController {
  constructor(private readonly lists: ChatListsService) {}

  @Route(routes.all)
  all() {
    return this.lists.all();
  }

  @Route(routes.create)
  @HttpCode(201)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lists.create(body.name, user.id);
  }

  @Route(routes.rename)
  rename(@RouteInput(byId) { params, body }: RouteInputOf<typeof routes.rename>) {
    return this.lists.rename(params.id, body.name);
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(@RouteInput(byId) { params }: RouteInputOf<typeof routes.remove>): Promise<void> {
    await this.lists.remove(params.id);
  }

  @Route(routes.addThread)
  @HttpCode(204)
  async add(
    @RouteInput(byIdThenPhone) { params }: RouteInputOf<typeof routes.addThread>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.lists.add({ listId: params.id, phone: params.phone, by: user.id });
  }

  @Route(routes.dropThread)
  @HttpCode(204)
  async drop(
    @RouteInput(byIdThenPhone) { params }: RouteInputOf<typeof routes.dropThread>,
  ): Promise<void> {
    await this.lists.drop(params.id, params.phone);
  }
}
