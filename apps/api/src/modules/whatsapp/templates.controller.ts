import { isTeacherTemplate, type TemplateView } from '@ab/shared';
import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import { can } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { TemplateRegistry } from './template.registry';

/** What a teacher's composer may offer: approved reminder templates, never a PDF one. */
const teacherMay = (t: TemplateView): boolean =>
  t.status === 'approved' && t.header_format !== 'document' && isTeacherTemplate(t.key);

/** Sent only by their own button (signed link, picked lesson): never from the picker (ThreadSendService). */
const OWN_BUTTON: ReadonlySet<string> = new Set(['lesson_feedback_request', 'lesson_join_link', 'lesson_rating']);

/**
 * What a salesperson's composer may offer (docs/16: she answers every family, like the admin): every
 * approved template the thread send accepts, so she can open or reopen any chat; never a PDF one.
 */
const salesMay = (t: TemplateView): boolean =>
  t.status === 'approved' && t.header_format !== 'document' && !OWN_BUTTON.has(t.key);

/**
 * T1–T3 (docs/12 §4): the template registry and its health (R-MSG-01). The health check and
 * submitting stay admin only; a teacher (teacher mode) or a salesperson lists only what they may send.
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.manage')
@Controller('messaging/templates')
export class TemplatesController {
  constructor(private readonly registry: TemplateRegistry) {}

  @Get()
  @Permissions('messages.read')
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    const all = await this.registry.list();
    if (can(user, 'templates.manage')) return all;
    return all.filter(user.role === 'sales' ? salesMay : teacherMay);
  }

  /** Reads Meta's list and syncs status, quality and text. 503 not_configured, 502 meta_error. */
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
}
