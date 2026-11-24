import type { AccountProfile } from '@ab/shared';

export interface SectionProps {
  profile: AccountProfile;
  onDone: (message: string) => void;
}
