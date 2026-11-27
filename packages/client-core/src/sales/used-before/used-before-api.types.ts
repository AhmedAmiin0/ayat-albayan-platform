import type { RouteResult } from '@ab/core';
import type { UsedBeforeEdit, usedBeforeRoutes } from '@ab/shared';

type Answer<K extends keyof typeof usedBeforeRoutes> = Promise<
  RouteResult<(typeof usedBeforeRoutes)[K]>
>;

export interface UsedBeforeChange extends UsedBeforeEdit {
  id: string;
}

export interface UsedBeforeCalls {
  state: (id: string) => Answer<'state'>;
  edit: (input: UsedBeforeChange) => Answer<'edit'>;
}
