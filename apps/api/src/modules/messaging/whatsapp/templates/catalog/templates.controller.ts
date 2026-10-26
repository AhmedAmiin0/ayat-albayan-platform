import {
  restrictedMay,
  sendsAllTemplates,
  templateHealthSchema,
  templateCrmNameSchema,
  templateCrmStatusSchema,
  templateLineSchema,
  templateNumberSchema,
  templateStarterSchema,
  type TemplateHealthView,
  type TemplateLineView,
  type TemplateMoveView,
  type TemplateNumberSetView,
  type TemplateView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../../common/auth/decorators';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../../common/http/http';
import { TemplateManagerGuard } from './template-manager.guard';
import { TemplateNumbers } from '../sync/template-numbers.service';
import { TemplateStarters } from './template-starters';
import { TemplateRegistry } from './template.registry';

/**
 * T1–T3 (docs/12 §4): the template registry and its health (R-MSG-01), per number (owner 2026-10-18).
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
    private readonly starters: TemplateStarters,
    private readonly numbers: TemplateNumbers,
  ) {}

  @Get()
  @Permissions('messages.read')
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    const all = await this.registry.list();
    return sendsAllTemplates(user) ? all : all.filter(restrictedMay);
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
    return this.registry.verifyAll(input.line ? { line: input.line } : {});
  }

  /** The only way a template reaches Meta: the admin's explicit, audited action, to the row's own number. */
  @Post(':key/submit')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  submit(@Param('key') key: string, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    return this.registry.submit(key, user.id);
  }

  /** «نقل إلى الرقم الآخر»: the number this template goes from, then that number's sync; audited. */
  @Patch(':key/line')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setLine(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateMoveView> {
    const input = parseOrThrow(templateLineSchema, body);
    return this.registry.moveLine({ key, line: input.line }, user.id);
  }

  /**
   * «الرقم» (docs/23c decision 9): the template's own number, null = its role's default; audited. 404
   * template_not_found / unknown_number. Never blocked: not_approved_on_number only warns.
   */
  @Put(':key/number')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setNumber(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateNumberSetView> {
    const input = parseOrThrow(templateNumberSchema, body);
    return this.numbers.setNumber({ key, number_id: input.number_id }, user.id);
  }

  /** A crm line's template (docs/19): «معتمد في نظام CRM» / «غير متاح في نظام CRM» by hand; 409 not_crm_line; audited. */
  @Put(':key/crm-status')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmStatus(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    const input = parseOrThrow(templateCrmStatusSchema, body);
    return this.registry.setCrmStatus({ key, status: input.status }, user.id);
  }

  /** A crm line's template (docs/19): its name / language in the CRM; blank = the default; 409 not_crm_line; audited. */
  @Put(':key/crm-name')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmName(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    const input = parseOrThrow(templateCrmNameSchema, body);
    return this.registry.setCrmName({ key, ...input }, user.id);
  }

  /** The allow-list: the admin offers a template to the restricted roles (teachers, sales…), or stops; audited. */
  @Patch(':key/starter')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setStarter(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    const input = parseOrThrow(templateStarterSchema, body);
    return this.starters.set(key, input.sales_starter, user.id);
  }
}
