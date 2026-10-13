import { restrictedMay, sendsAllTemplates, templateStarterSchema, type TemplateView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { TemplateStarters } from './template-starters';
import { TemplateRegistry } from './template.registry';

/**
 * T1–T3 (docs/12 §4): the template registry and its health (R-MSG-01). The health check and
 * submitting stay admin only. templates.manage or templates.send_all list every template; every other
 * role (teacher, sales, classroom assistant, custom) only the restricted allow-list (owner 2026-10-12):
 * restrictedMay, the same rule the thread send applies (403 template_not_allowed).
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.manage')
@Controller('messaging/templates')
export class TemplatesController {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly starters: TemplateStarters,
  ) {}

  @Get()
  @Permissions('messages.read')
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    const all = await this.registry.list();
    return sendsAllTemplates(user.permissions) ? all : all.filter(restrictedMay);
  }

  /**
   * Reads each line's Meta list, syncs status, quality and text, and imports the chat line's new
   * templates (flagged only for RESTRICTED_TEMPLATE_DEFAULTS; a known row's flag is never touched).
   * 503 not_configured, 502 meta_error.
   */
  @Post('health')
  @HttpCode(200)
  health(): Promise<TemplateView[]> {
    return this.registry.verifyAll();
  }

  /** The only way a template reaches Meta: the admin's explicit, audited action. */
  @Post(':key/submit')
  @HttpCode(200)
  submit(@Param('key') key: string, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    return this.registry.submit(key, user.id);
  }

  /**
   * The allow-list: the admin offers a template to the restricted roles (teachers, sales…), or stops;
   * audited. Turning on one never offerable (a booking confirmation or lesson reminder…) is 400
   * template_not_offerable; turning off always works (owner 2026-10-13).
   */
  @Patch(':key/starter')
  @HttpCode(200)
  setStarter(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    const input = parseOrThrow(templateStarterSchema, body);
    return this.starters.set(key, input.sales_starter, user.id);
  }
}
