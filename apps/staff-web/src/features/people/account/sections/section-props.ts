import type { AccountProfile } from '@ab/shared';

/** What every «حسابي» section gets: the loaded profile and the page's toast. */
export interface SectionProps {
  profile: AccountProfile;
  onDone: (message: string) => void;
}
