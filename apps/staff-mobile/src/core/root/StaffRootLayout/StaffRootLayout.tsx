import { RootProviders } from '@ab/mobile-kit';
import { StaffStack } from './StaffStack';
import { useStaffRootLayout } from './use-staff-root-layout';

/**
 * Fonts + language + translation overrides + session gate (useRootBoot), then one stack: admins
 * (tabs), teachers /teacher (a real segment: no URL shared with the admin's), sales /sales, the
 * classroom assistant /assistant, everyone else /login. The family app is apps/family-mobile
 * (docs/50).
 */
export function StaffRootLayout() {
  const { gate, boot } = useStaffRootLayout();
  return (
    <RootProviders gate={gate}>
      <StaffStack gate={gate} settled={boot.settled} fontsLoaded={boot.fontsLoaded} />
    </RootProviders>
  );
}
