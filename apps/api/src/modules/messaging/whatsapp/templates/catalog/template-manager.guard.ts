import { managesTemplates } from '@ab/shared';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import { waHttpError } from './template.mapper';

/**
 * Every templates.manage route (sync, submit, move, the allow-list, the lines and their check): never a
 * role based on sales, the classroom assistant or teacher, whatever it was granted (owner 2026-10-18;
 * staging's system sales role held a stray templates.manage). Runs after the global AuthGuard, which
 * already checked the permission: 403 allow_list_only.
 */
@Injectable()
export class TemplateManagerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!managesTemplates(user)) throw waHttpError('allow_list_only', 403);
    return true;
  }
}
