import type { NotificationEntryView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meQueryOptions } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** The catalogue's query key prefix (NotificationCatalogue adds the settings' fetch time). */
export const CATALOGUE_KEY = ['admin', 'notifications'] as const;

/** PATCH /admin/notifications/:key body: the new state and, for an essential OFF, the typed word. */
interface RuleToggle {
  key: NotificationEntryView['key'];
  enabled: boolean;
  confirmText?: string;
}

/** One row's switch, then the catalogue refetches (state, blockers and the switch all come from it). */
export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled, confirmText }: RuleToggle) =>
      apiSend<NotificationEntryView>(
        'PATCH',
        `/admin/notifications/${encodeURIComponent(key)}`,
        confirmText === undefined ? { enabled } : { enabled, confirmText },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATALOGUE_KEY }),
  });
}

/** Does GET /auth/me list this key? Raw strings: the key may be newer than this build's Permission list. */
export function holdsIn(me: unknown, permission: string): boolean {
  if (typeof me !== 'object' || me === null) return false;
  const list: unknown = Reflect.get(me, 'permissions');
  return Array.isArray(list) && list.includes(permission);
}

/** notifications.manage held (strict: false until /auth/me answers, so nothing switches by mistake). */
export function useCanManageNotifications(): boolean {
  const me = useQuery(meQueryOptions({ apiFetch }));
  return holdsIn(me.data, 'notifications.manage');
}
