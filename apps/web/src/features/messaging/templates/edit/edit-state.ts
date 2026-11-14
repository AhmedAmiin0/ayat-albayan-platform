import type { AuthorTemplate } from '@ab/client-core';
import {
  editRoute, isCodeBound, nextEditAt,
} from '@ab/shared';

// What the edit form tells and allows (owner 2026-11-14), from Meta's rules: a template under
// review (or disabled) waits; an approved one waits for its next edit; a never-sent one is ours.

export type EditStage = 'blocked' | 'limited' | 'local' | 'meta';

export interface EditState {
  stage: EditStage;
  /** Variables and buttons fixed: only the words change (the platform sends it by itself). */
  bound: boolean;
  /** When the next edit of an approved template opens (ISO), while `limited`. */
  nextAt: string | null;
}

const ROUTE_STAGE: Record<'meta' | 'local', EditStage> = { meta: 'meta', local: 'local' };

export function editState(tpl: AuthorTemplate, now: Date): EditState {
  const route = editRoute(tpl.status);
  const limit = { status: tpl.status, edits: tpl.approved_edits ?? [], now };
  const nextAt = nextEditAt(limit);
  const stage: EditStage = route ? ROUTE_STAGE[route] : 'blocked';
  return { stage: nextAt ? 'limited' : stage, bound: isCodeBound(tpl.key), nextAt };
}

/** The save button works only in these stages. */
export const canSave = (state: EditState): boolean => state.stage === 'meta' || state.stage === 'local';
