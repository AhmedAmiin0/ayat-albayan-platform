import type { Locale } from '@ab/core';
import {
  translationKeysPageSchema,
  translationLocaleSchema,
  translationRoutes as routes,
  type TranslationKeysPage,
  type TranslationOverrides,
} from '@ab/i18n';
import { Controller, Get, Headers, HttpCode, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Public } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { TranslationsService } from './translations.service';

/** The bit of the Fastify reply used here (no direct `fastify` dependency). */
interface CacheReply {
  header(name: string, value: string): unknown;
  status(code: number): unknown;
}

/**
 * Dynamic translations. The overrides map is public UI copy (the login page
 * needs it before sign-in), cached 60 s and revalidated by ETag; the editor routes are admin only.
 * Writes are recorded by the global ActivityInterceptor ('/i18n/:locale/:key').
 */
@ApiTags('i18n')
@Controller()
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Public()
  @Get('i18n/:locale/overrides')
  overrides(
    @ZodParam('locale', translationLocaleSchema) locale: Locale,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) reply: CacheReply,
  ): TranslationOverrides | undefined {
    const snap = this.translations.overrides(locale);
    reply.header('Cache-Control', 'public, max-age=60');
    reply.header('ETag', snap.etag);
    if (ifNoneMatch === snap.etag) {
      reply.status(304);
      return undefined;
    }
    return snap.values;
  }

  @ApiBearerAuth()
  @Permissions('translations.manage')
  @Route(routes.keys)
  keys(@RouteInput() { query }: RouteInputOf<typeof routes.keys>): TranslationKeysPage {
    return asResponse(translationKeysPageSchema, this.translations.keys(query));
  }

  @ApiBearerAuth()
  @Permissions('translations.manage')
  @Route(routes.save)
  @HttpCode(204)
  async save(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.save>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.translations.save({ ...params, value: body.value, actorId: user.id });
  }

  @ApiBearerAuth()
  @Permissions('translations.manage')
  @Route(routes.restore)
  @HttpCode(204)
  async restore(@RouteInput() { params }: RouteInputOf<typeof routes.restore>): Promise<void> {
    await this.translations.restore(params.locale, params.key);
  }
}
