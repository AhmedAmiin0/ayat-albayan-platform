import { savedReplyIdParam, savedReplyRoutes as routes } from '@ab/shared';
import { Body, Controller, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { RepliesUserGuard, replyNotFound } from './saved-replies.guard';
import { SavedRepliesService } from './saved-replies.service';

const byId = { badParam: replyNotFound };

/** Shared list writes need saved_replies.manage; /stage only copies, sends keep their gates. */
@ApiBearerAuth()
@UseGuards(RepliesUserGuard)
@Controller()
export class SavedRepliesController {
  constructor(private readonly replies: SavedRepliesService) {}

  @Route(routes.all)
  all(@CurrentUser() user: AuthUser) {
    return this.replies.list(user);
  }

  @Route(routes.create)
  @HttpCode(201)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.replies.create(user, body);
  }

  @Route(routes.uploadUrl)
  @HttpCode(201)
  uploadUrl(
    @RouteInput() { body }: RouteInputOf<typeof routes.uploadUrl>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.replies.uploadUrl(user, body);
  }

  // A bad :id (404) wins over a bad body here, so the body is parsed in the handler after the
  // param pipe; @RouteInput() parses the body first.
  @Route(routes.update)
  update(
    @ZodParam('id', savedReplyIdParam, replyNotFound) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    return this.replies.update(user, id, parseOrThrow(routes.update.body, body));
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(
    @RouteInput(byId) { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.replies.remove(user, params.id);
  }

  @Route(routes.move)
  @HttpCode(200)
  move(
    @RouteInput(byId) { params, body }: RouteInputOf<typeof routes.move>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.replies.move(user, params.id, body.direction);
  }

  @Route(routes.stage)
  @HttpCode(201)
  stage(
    @RouteInput(byId) { params, body }: RouteInputOf<typeof routes.stage>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.replies.stage(user, params.id, body.clientRequestId);
  }
}
