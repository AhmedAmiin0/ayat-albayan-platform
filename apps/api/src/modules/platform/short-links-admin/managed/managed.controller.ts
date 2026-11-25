import {
  shortCodeSchema,
  shortLinkCreateSchema,
  shortLinkListQuerySchema,
  shortLinkPeopleQuerySchema,
  shortLinkUpdateSchema,
  type ShortLinkCreate,
  type ShortLinkDetail,
  type ShortLinkListQuery,
  type ShortLinkPage,
  type ShortLinkPeopleQuery,
  type ShortLinkPerson,
  type ShortLinkSentDetail,
  type ShortLinkUpdate,
} from '@ab/shared';
import { Controller, Get, Patch, Post, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { ShortLinksAdmin } from './short-links-admin';

const code = () => ZodParam('code', shortCodeSchema, () => notFound('short_link_not_found'));

/**
 * The managed short links for the admin and sales (docs/19): short_links.manage
 * on every route; without short_links.all a user sees and changes only the links they made (the
 * same 404 as an unknown code). The people picker answers names and phones of enabled profiles.
 */
@ApiTags('short-links')
@ApiBearerAuth()
@Permissions('short_links.manage')
@Controller('short-links')
export class ManagedLinksController {
  constructor(@Inject(ShortLinksAdmin) private readonly admin: ShortLinksAdmin) {}

  @Get()
  list(
    @ZodQuery(shortLinkListQuerySchema) query: ShortLinkListQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkPage> {
    return this.admin.list(query, user);
  }

  @Get('people')
  people(
    @ZodQuery(shortLinkPeopleQuerySchema) query: ShortLinkPeopleQuery,
  ): Promise<ShortLinkPerson[]> {
    return this.admin.people(query.search);
  }

  @Post()
  create(
    @ZodBody(shortLinkCreateSchema) body: ShortLinkCreate,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkSentDetail> {
    return this.admin.create(body, user);
  }

  @Get(':code')
  detail(@code() c: string, @CurrentUser() user: AuthUser): Promise<ShortLinkDetail> {
    return this.admin.detail(c, user);
  }

  @Patch(':code')
  update(
    @code() c: string,
    @ZodBody(shortLinkUpdateSchema) body: ShortLinkUpdate,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortLinkDetail> {
    return this.admin.update(c, body, user);
  }

  @Post(':code/revoke')
  revoke(@code() c: string, @CurrentUser() user: AuthUser): Promise<ShortLinkDetail> {
    return this.admin.revoke(c, user);
  }

  @Post(':code/resend')
  resend(@code() c: string, @CurrentUser() user: AuthUser): Promise<ShortLinkSentDetail> {
    return this.admin.resend(c, user);
  }
}
