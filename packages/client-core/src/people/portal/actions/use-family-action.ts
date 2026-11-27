import type { PortalActionResult } from '@ab/shared';
import { PORTAL_KEY } from '../portal-api';
import {
  familyFailureText, runFamilyAction, type FailureWords, type FamilyAction,
} from './family-action';
import type { PortalLessonSends } from './lesson-sends.types';

// client-core stays React-free: each app hands in its own TanStack hooks, sends and words.

/** The part of TanStack's useMutation result the hook reads. */
interface ActionMutation {
  mutate: (a: FamilyAction, options?: { onSuccess?: () => void }) => void;
  reset: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

interface ActionOptions {
  mutationFn: (a: FamilyAction) => Promise<PortalActionResult>;
  onSuccess: () => Promise<unknown>;
}

export interface FamilyActionPorts {
  useMutation: (options: ActionOptions) => ActionMutation;
  useQueryClient: () => {
    invalidateQueries: (f: { queryKey: readonly string[] }) => Promise<void>;
  };
  sends: PortalLessonSends;
  /** portal.actions in the app's language (read at render: the language may change). */
  words: () => FailureWords;
}

export interface FamilyActionState {
  /** `onDone` once it lands (after every portal read was asked to refresh). */
  send: (a: FamilyAction, onDone?: () => void) => void;
  busy: boolean;
  /** The refusal in the family's words; null when nothing failed. */
  error: string | null;
  reset: () => void;
}

/** The app's useFamilyAction: send one action, then every portal read refreshes. */
export function createUseFamilyAction(ports: FamilyActionPorts): () => FamilyActionState {
  return function useFamilyAction() {
    const client = ports.useQueryClient();
    const action = ports.useMutation({
      mutationFn: runFamilyAction(ports.sends),
      onSuccess: () => client.invalidateQueries({ queryKey: PORTAL_KEY }),
    });
    return {
      send: (a, onDone) => action.mutate(a, { onSuccess: onDone }),
      busy: action.isPending,
      error: action.isError ? familyFailureText(action.error, ports.words()) : null,
      reset: action.reset,
    };
  };
}
