import {
  translationKeysQuerySchema,
  translationLocaleSchema,
  translationValueSchema,
  type TranslationKeysPage,
  type TranslationOverrides,
} from '@ab/shared';
import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Public } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { TranslationsService } from './translations.service';

/** The bit of the Fastify reply used here (no direct `fastify` dependency). */
interface CacheReply {
  header(name: string, value: string): unknown;
  status(code: number): unknown;
}

/**
 * Dynamic translations (owner, 2026-10-05). The overrides map is public UI copy (the login page
 * needs it before sign-in), cached 60 s and revalidated by ETag; the editor routes are admin only.
 * Writes are recorded by the global ActivityInterceptor ('/i18n/:locale/:key').
 */
@ApiTags('i18n')
@Controller('i18n')
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Public()
  @Get(':locale/overrides')
  overrides(
    @Param('locale') locale: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) reply: CacheReply,
  ): TranslationOverrides | undefined {
    const snap = this.translations.overrides(parseOrThrow(translationLocaleSchema, locale));
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
  @Get('keys')
  keys(@Query() query: unknown): TranslationKeysPage {
    return this.translations.keys(parseOrThrow(translationKeysQuerySchema, query));
  }

  @ApiBearerAuth()
  @Permissions('translations.manage')
  @Put(':locale/:key')
  @HttpCode(204)
  async save(
    @Param() params: Record<string, string>,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const locale = parseOrThrow(translationLocaleSchema, params['locale']);
    const { value } = parseOrThrow(translationValueSchema, body);
    await this.translations.save({ locale, key: params['key'] ?? '', value, actorId: user.id });
  }

  @ApiBearerAuth()
  @Permissions('translations.manage')
  @Delete(':locale/:key')
  @HttpCode(204)
  async restore(@Param('locale') locale: string, @Param('key') key: string): Promise<void> {
    await this.translations.restore(parseOrThrow(translationLocaleSchema, locale), key);
  }
}
