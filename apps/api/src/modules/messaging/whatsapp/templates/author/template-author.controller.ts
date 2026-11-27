import { authoredTemplateRoutes as routes, type TemplateView } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { TemplateAuthor } from './template-author';

/** templates.author never reaches templates.manage routes nor lifts the allow-list. */
@ApiBearerAuth()
@Controller()
export class TemplateAuthorController {
  constructor(@Inject(TemplateAuthor) private readonly author: TemplateAuthor) {}

  /** Every status with Meta's reason (last_error). */
  @Route(routes.list)
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    return asResponse(routes.list.response, await this.author.list(user.id));
  }

  /** A new template, straight to Meta on the chat line, on the allow-list once approved. */
  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.author.create(body, user.id);
  }

  /** 403 not_author_editable (off the allow-list, code-bound, PDF…); Meta's edit rules (409). */
  @Route(routes.edit)
  @HttpCode(200)
  edit(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.edit>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.author.edit(params.key, body, user.id);
  }
}
