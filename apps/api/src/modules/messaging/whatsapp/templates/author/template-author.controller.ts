import {
  templateAuthorEditSchema, templateAuthorSchema, templateKeyParam, type TemplateView,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { TemplateAuthor } from './template-author';

/** templates.author never reaches templates.manage routes nor lifts the allow-list. */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.author')
@Controller('messaging/templates/authored')
export class TemplateAuthorController {
  constructor(@Inject(TemplateAuthor) private readonly author: TemplateAuthor) {}

  /** Every status with Meta's reason (last_error). */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    return this.author.list(user.id);
  }

  /** A new template, straight to Meta on the chat line, on the allow-list once approved. */
  @Post()
  create(
    @ZodBody(templateAuthorSchema) body: z.output<typeof templateAuthorSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.author.create(body, user.id);
  }

  /** 403 not_author_editable (off the allow-list, code-bound, PDF…); Meta's edit rules (409). */
  @Patch(':key')
  @HttpCode(200)
  edit(
    @ZodParam('key', templateKeyParam) key: string,
    @ZodBody(templateAuthorEditSchema) body: z.output<typeof templateAuthorEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.author.edit(key, body, user.id);
  }
}
