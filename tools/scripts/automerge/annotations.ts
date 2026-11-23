import type { Annotation } from './facts.schemas.ts';

/** guard:packages prints it when a PR widens refactor/guards/packages.json: the owner's go only. */
const WIDENED = 'layer table widened';

export const widened = (annotations: readonly Annotation[]): boolean =>
  annotations.some((a) => `${a.title ?? ''}\n${a.message ?? ''}`.includes(WIDENED));
