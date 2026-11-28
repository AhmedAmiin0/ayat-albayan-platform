import { RATING_TEMPLATE, type TemplateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { meQuery, usePermissions, t } from '@ab/web-kit';
import { FEEDBACK_TEMPLATE } from '@/features/teaching/feedback/types';
import { templatesQuery } from '@/features/messaging/templates/api';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { forAudience } from './template-params';

/** The feedback request and lesson rating are excluded: each is sent only by its own action. */
export function allowedTemplates(
  list: readonly TemplateView[] | undefined,
  teacher: boolean,
): TemplateView[] {
  return (list ?? []).filter(
    (x) =>
      x.status === 'approved' &&
      x.key !== FEEDBACK_TEMPLATE &&
      x.key !== RATING_TEMPLATE &&
      forAudience(x, teacher),
  );
}

/**
 * May the inbox read the template list and the send gate (W12)? The admin inbox always does, as
 * before; teacher and sales modes only with messages.read (an edited sales role may drop it).
 */
export function useReadsMessaging(): boolean {
  const admin = useInboxMode() === 'admin';
  const { can } = usePermissions();
  return admin || can('messages.read');
}

/** Why teacher / sales modes have nothing to send: no messages.read, or no template for them. */
export type NoneReason = 'no_permission' | 'no_template';

/**
 * Teacher and sales modes with nothing they may send (W7), and why: a known user without
 * messages.read (the list is never asked, W12), or the list loaded with none allowed for this
 * audience. Null when something may be sent, and always in admin mode.
 */
export function useNoneAllowed(teacher: boolean): NoneReason | null {
  const staff = useInboxMode() !== 'admin';
  const known = !!useQuery(meQuery).data;
  const reads = useReadsMessaging();
  const templates = useQuery({ ...templatesQuery, enabled: reads });
  if (!staff) return null;
  if (!reads) return known ? 'no_permission' : null;
  return templates.isSuccess && allowedTemplates(templates.data, teacher).length === 0 ? 'no_template' : null;
}

/** The refusal line: the permission one without messages.read, else the template one given. */
export const noneAllowedText = (reason: NoneReason, noTemplate: string): string =>
  reason === 'no_permission' ? t.inbox.composer.noPermissionHelp : noTemplate;
