import type { TemplateView } from '@ab/shared';
import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { TemplateRegistry } from './template.registry';

/** T1–T3 (docs/12 §4): the template registry and its health, admin only (R-MSG-01). */
@ApiTags('messaging')
@ApiBearerAuth()
@Roles('admin')
@Controller('messaging/templates')
export class TemplatesController {
  constructor(private readonly registry: TemplateRegistry) {}

  @Get()
  list(): Promise<TemplateView[]> {
    return this.registry.list();
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
