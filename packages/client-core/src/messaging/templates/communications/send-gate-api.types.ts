import type { AcademySettings, GateSwitchInput } from '@ab/shared';

export interface SendGateCalls {
  sending: (body: GateSwitchInput) => Promise<AcademySettings>;
  auto: (body: GateSwitchInput) => Promise<AcademySettings>;
  cutover: (done: boolean) => Promise<AcademySettings>;
}
