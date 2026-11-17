import { familyErrorOf, PORTAL_KEY, runFamilyAction, type FamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/mobile-kit';
import { portalLessonSend } from './api';

/** The refusal in the family's words (portal.actions.errors), else the general one. */
export function familyFailure(error: unknown): string {
  const known = familyErrorOf(error);
  return known ? t.portal.actions.errors[known] : t.portal.actions.failed;
}

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
  const error = action.isError ? familyFailure(action.error) : null;
  return {
    send: (a: FamilyAction, onDone?: () => void) => action.mutate(a, { onSuccess: onDone }),
    busy: action.isPending,
    error,
    reset: action.reset,
  };
}
