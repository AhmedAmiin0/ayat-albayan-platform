import { render, screen } from '@testing-library/react-native';
import { useRootGate } from '../../auth/root-gate';
import { AppText } from '../../ui/primitives/AppText';
import { RootProviders } from './RootProviders';

function Gate() {
  return <AppText>{useRootGate()}</AppText>;
}

test('the screens below read the root gate', async () => {
  await render(
    <RootProviders gate="teacher">
      <Gate />
    </RootProviders>,
  );
  expect(screen.getByText('teacher')).toBeOnTheScreen();
});
