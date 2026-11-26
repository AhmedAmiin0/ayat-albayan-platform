import { RootProviders } from '@ab/mobile-kit';
import { FamilyStack } from './FamilyStack';
import { useFamilyRootLayout } from './use-family-root-layout';

/** docs/50 §7: staff are signed out by the gate with the inverted wrongApp notice. */
export function FamilyRootLayout() {
  const { gate, boot } = useFamilyRootLayout();
  return (
    <RootProviders gate={gate}>
      <FamilyStack gate={gate} boot={boot} />
    </RootProviders>
  );
}
