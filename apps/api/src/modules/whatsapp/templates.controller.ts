import { isTeacherTemplate, templateStarterSchema, type TemplateView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import { can } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { TemplateStarters } from './template-starters';
import { TemplateRegistry } from './template.registry';

/** What a teacher's composer may offer: approved reminder templates, never a PDF one. */
const teacherMay = (t: TemplateView): boolean =>
  t.status === 'approved' && t.header_format !== 'document' && isTeacherTemplate(t.key);

/** Sent only by their own button (signed link, picked lesson): never from the picker (ThreadSendService). */
const OWN_BUTTON: ReadonlySet<string> = new Set(['lesson_feedback_request', 'lesson_join_link', 'lesson_rating']);

/**
 * What a salesperson's composer may offer (owner 2026-10-12, docs/16): only the approved templates the
 * admin ticked «قالب بدء محادثة للمبيعات» (the chat line's starters), to open or reopen a chat; never a
 * PDF one. The thread send refuses any other (403 template_not_allowed).
 */
const salesMay = (t: TemplateView): boolean =>
  t.status === 'approved' && t.sales_starter && t.header_format !== 'document' && !OWN_BUTTON.has(t.key);

/**
 * T1–T3 (docs/12 §4): the template registry and its health (R-MSG-01). The health check and
 * submitting stay admin only; a teacher (teacher mode) or a salesperson lists only what they may send.
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
    if (can(user, 'templates.manage')) return all;
    return all.filter(user.role === 'sales' ? salesMay : teacherMay);
  }

  /**
   * Reads each line's Meta list, syncs status, quality and text, and imports the chat line's new
   * templates as sales starters. 503 not_configured, 502 meta_error.
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

  /** «قالب بدء محادثة للمبيعات»: the admin offers a template to sales to start a chat, or stops; audited. */
  @Patch(':key/starter')
  @HttpCode(200)
  setStarter(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    const input = parseOrThrow(templateStarterSchema, body);
    return this.starters.set(key, input.sales_starter, user.id);
  }
}
