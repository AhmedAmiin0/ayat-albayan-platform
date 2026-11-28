import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RootProviders } from './RootProviders';

test('the keyboard provider holds every app root, so frames and sheets follow the keyboard', async () => {
  await render(
    <RootProviders gate="out">
      <Text>app</Text>
    </RootProviders>,
  );
  expect(await screen.findByText('app')).toBeTruthy();
  expect(screen.toJSON()).toMatchObject({ type: 'KeyboardProvider' });
});
