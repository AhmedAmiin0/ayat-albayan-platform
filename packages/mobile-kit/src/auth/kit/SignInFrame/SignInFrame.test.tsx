import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SignInFrame } from './SignInFrame';

test('without its own header: the title as a header and the line under it', async () => {
  await render(
    <SignInFrame title="sign in" subtitle="one line">
      <Text>form</Text>
    </SignInFrame>,
  );
  expect(screen.getByRole('header', { name: 'sign in' })).toBeTruthy();
  expect(screen.getByText('one line')).toBeTruthy();
  expect(screen.getByText('form')).toBeTruthy();
});

test('an app header takes the place of the mark and title', async () => {
  await render(
    <SignInFrame title="sign in" header={<Text>family top</Text>}>
      <Text>form</Text>
    </SignInFrame>,
  );
  expect(screen.getByText('family top')).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'sign in' })).toBeNull();
});
