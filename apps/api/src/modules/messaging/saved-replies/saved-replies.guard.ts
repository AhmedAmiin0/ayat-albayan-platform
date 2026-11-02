import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { z } from 'zod';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden, notFound } from '@/common/http/errors';

/**
 * «الردود السريعة» (owner 2026-10-25) belong to the inbox of the admin and the assistants (base role
 * sales) with inbox.read; a teacher or a guardian never gets them, whatever a custom role grants.
 * 403 saved_replies_forbidden otherwise.
 */
export function assertRepliesUser(user: AuthUser): void {
  const staff = user.role === 'admin' || user.role === 'sales';
  if (!staff || !can(user, 'inbox.read')) throw forbidden('saved_replies_forbidden');
}

/** `assertRepliesUser` as a guard: it runs before the body pipe, so a teacher gets 403. */
@Injectable()
export class RepliesUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    assertRepliesUser(ctx.switchToHttp().getRequest<{ user: AuthUser }>().user);
    return true;
  }
}

/** May this caller add, edit, delete or reorder the SHARED list? */
export const managesShared = (user: AuthUser): boolean => can(user, 'saved_replies.manage');

const uuid = z.uuid();

/** `:id` that is not a uuid cannot name a reply: 404 saved_reply_not_found (never a 500 from Postgres). */
export function replyIdParam(raw: string): string {
  if (!uuid.safeParse(raw).success) throw notFound('saved_reply_not_found');
  return raw;
}
