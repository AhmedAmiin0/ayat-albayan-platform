import { familyFailureText, PORTAL_KEY, runFamilyAction, type FamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { portalLessonApi } from '@/features/people/portal/api';

/**
 * «خيارات الحلقة»'s writes on the web portal (owner 2026-11-17), the family app's own rules
 * (@ab/client-core): once one lands, every portal read refreshes.
 */
export function useFamilyAction() {
  const client = useQueryClient();
  const action = useMutation({
    mutationFn: runFamilyAction(portalLessonApi),
    onSuccess: () => client.invalidateQueries({ queryKey: PORTAL_KEY }),
  });
  return {
    send: (a: FamilyAction, onDone?: () => void) => action.mutate(a, { onSuccess: onDone }),
    busy: action.isPending,
    error: action.isError ? familyFailureText(action.error, t.portal.actions) : null,
    reset: action.reset,
  };
}
