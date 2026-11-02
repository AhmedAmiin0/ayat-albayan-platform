import {
  restrictedMay, sendsAllTemplates, templateCreateSchema, templateHealthSchema,
  type TemplateHealthView, type TemplateLineView, type TemplateView,
} from '@ab/shared';
import {
  Body, Controller, Get, HttpCode, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { parseOrThrow } from '@/common/http/http';
import { TemplateCreator } from '@/modules/messaging/whatsapp/templates/create/template-create';
import { TemplateManagerGuard } from './template-manager.guard';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';
import { TemplateRegistry } from './template.registry';

/**
 * T1–T3 (docs/12 §4): the template registry and its health (the edits: TemplateEditsController) (R-MSG-01), per number (owner 2026-10-18).
 * Every route but the list is admin only: templates.manage, and never a role based on sales, the
 * classroom assistant or teacher (TemplateManagerGuard, 403 allow_list_only). templates.manage or
 * templates.send_all list every template; every other role (teacher, sales, classroom assistant, custom)
 * only the restricted allow-list (owner 2026-10-12): restrictedMay, the rule the thread send applies.
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.manage')
@Controller('messaging/templates')
export class TemplatesController {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly verifier: TemplateVerifier,
    private readonly creator: TemplateCreator,
  ) {}

  @Get()
  @Permissions('messages.read')
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    const all = await this.registry.list();
    return sendsAllTemplates(user) ? all : all.filter(restrictedMay);
  }

  /** «قالب جديد» (owner 2026-10-31): an unsubmitted row; 409 invalid_template / template_exists. */
  @Post()
  @UseGuards(TemplateManagerGuard)
  create(
    @ZodBody(templateCreateSchema) body: z.output<typeof templateCreateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.creator.create(body, user.id);
  }

  /** Each number: driver, WABA and phone ids (env only, no Meta call), its newest check and its last sync. */
  @Get('lines')
  @UseGuards(TemplateManagerGuard)
  lines(): Promise<TemplateLineView[]> {
    return this.registry.lineViews();
  }

  /**
   * One number's sync with Meta (`line` in the body or the query), or every configured number: its rows'
   * status, quality and text from its own WABA, and that WABA's new templates imported (flagged only for
   * RESTRICTED_TEMPLATE_DEFAULTS from the chat WABA). A line's read failure is that line's error (200).
   * 503 not_configured, 409 template_sync_off.
   */
  @Post('health')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  health(@Body() body: unknown, @Query('line') line?: string): Promise<TemplateHealthView> {
    const input = parseOrThrow(templateHealthSchema, body ?? (line ? { line } : {}));
    return this.verifier.verifyAll(input.line ? { line: input.line } : {});
  }
}
