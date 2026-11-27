import type { FamilyPick } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import type { Page } from '@/features/children/WithPick/WithPick.types';

export type Waiting = Exclude<FamilyPick['state'], 'one'>;

export interface PickedProps {
  home: PortalHome;
  page: Page;
}
