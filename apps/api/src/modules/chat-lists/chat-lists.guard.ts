import { chatListPhone } from '@ab/shared';
import { z } from 'zod';
import { can } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { badRequest, forbidden, notFound } from '../scheduling/errors';

/**
 * Every lists route needs inbox.lists (the route's @Permissions) AND inbox.read, and the inbox of the
 * admin or an assistant (base role sales): a teacher never gets lists, whatever a custom role grants
 * (owner 2026-10-20, docs/22 §2). 403 lists_forbidden otherwise.
 */
export function assertListsUser(user: AuthUser): void {
  const staff = user.role === 'admin' || user.role === 'sales';
  if (!staff || !can(user, 'inbox.read') || !can(user, 'inbox.lists')) throw forbidden('lists_forbidden');
}

/** May this caller see a chat's lists and filter by one (GET /threads, /threads/:phone)? */
export function seesLists(user: AuthUser): boolean {
  return (user.role === 'admin' || user.role === 'sales') && can(user, 'inbox.lists');
}

const uuid = z.uuid();

/** `:id` that is not a uuid cannot name a list: 404 list_not_found (never a 500 from Postgres). */
export function listIdParam(raw: string): string {
  if (!uuid.safeParse(raw).success) throw notFound('list_not_found');
  return raw;
}

/** True when `raw` can be a list id (GET /threads?list=: anything else is an empty page). */
export const isListId = (raw: string): boolean => uuid.safeParse(raw).success;

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
export function listPhoneParam(raw: string): string {
  const phone = chatListPhone(raw);
  if (!phone) throw badRequest('invalid_phone');
  return phone;
}
