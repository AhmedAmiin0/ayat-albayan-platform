import type { AcademySettings, GateCutoverInput, GateSwitchInput } from '@ab/settings';

export interface SendGateCalls {
  sending: (body: GateSwitchInput) => Promise<AcademySettings>;
  auto: (body: GateSwitchInput) => Promise<AcademySettings>;
  cutover: (body: GateCutoverInput) => Promise<AcademySettings>;
}
