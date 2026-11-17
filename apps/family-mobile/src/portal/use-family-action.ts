import { familyFailureText, PORTAL_KEY, runFamilyAction, type FamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/mobile-kit';
import { portalLessonSend } from './api';

/**
 * «خيارات الحلقة»'s writes (owner 2026-11-17): confirm, excuse, ask for another time, withdraw.
 * Once one lands every portal read refreshes; `onDone` says so on the card.
 */
export function useFamilyAction() {
  const client = useQueryClient();
  const action = useMutation({
    mutationFn: runFamilyAction(portalLessonSend),
    onSuccess: () => client.invalidateQueries({ queryKey: PORTAL_KEY }),
  });
  const error = action.isError ? familyFailureText(action.error, t.portal.actions) : null;
  return {
    send: (a: FamilyAction, onDone?: () => void) => action.mutate(a, { onSuccess: onDone }),
    busy: action.isPending,
    error,
    reset: action.reset,
  };
}
