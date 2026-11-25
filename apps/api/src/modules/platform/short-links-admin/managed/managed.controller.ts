import {
  shortLinkRoutes as routes,
  type ShortLinkDetail,
  type ShortLinkPage,
  type ShortLinkPerson,
  type ShortLinkSentDetail,
} from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ShortLinksAdmin } from './short-links-admin';

const byCode = () => RouteInput({ badParam: () => notFound('short_link_not_found') });

/**
 * The managed short links for the admin and sales (docs/19): short_links.manage
 * on every route; without short_links.all a user sees and changes only the links they made (the
 * same 404 as an unknown code). The people picker answers names and phones of enabled profiles.
 */
@ApiTags('short-links')
@ApiBearerAuth()
@Permissions('short_links.manage')
@Controller()
export class ManagedLinksController {
  constructor(@Inject(ShortLinksAdmin) private readonly admin: ShortLinksAdmin) {}

  @Route(routes.list)
  list(
    @RouteInput() { query }: RouteInputOf<typeof routes.list>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkPage> {
    return this.admin.list(query, user);
  }

  @Route(routes.people)
  people(@RouteInput() { query }: RouteInputOf<typeof routes.people>): Promise<ShortLinkPerson[]> {
    return this.admin.people(query.search);
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkSentDetail> {
    return this.admin.create(body, user);
  }

  @Route(routes.detail)
  detail(
    @byCode() { params }: RouteInputOf<typeof routes.detail>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkDetail> {
    return this.admin.detail(params.code, user);
  }

  @Route(routes.update)
  update(
    @byCode() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkDetail> {
    return this.admin.update(params.code, body, user);
  }

  @Route(routes.revoke)
  revoke(
    @byCode() { params }: RouteInputOf<typeof routes.revoke>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkDetail> {
    return this.admin.revoke(params.code, user);
  }

  @Route(routes.resend)
  resend(
    @byCode() { params }: RouteInputOf<typeof routes.resend>,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkSentDetail> {
    return this.admin.resend(params.code, user);
  }
}
