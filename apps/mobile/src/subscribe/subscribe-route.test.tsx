import { useLocalSearchParams } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { TabStack } from '@/nav/TabStack';

// The inbox tab's routes with stub screens: /inbox/subscribe is its own screen, not a lead id.
function StudentParam() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <Text>{`student=${studentId}`}</Text>;
}

test('the chat’s «جدّد» link opens the subscribe screen with its student', async () => {
  const pending = renderRouter(
    {
      'inbox/_layout': TabStack,
      'inbox/index': () => <Text>inbox</Text>,
      'inbox/[id]': () => <Text>lead</Text>,
      'inbox/subscribe': StudentParam,
    },
    { initialUrl: '/inbox/subscribe?studentId=s-1&phone=%2B966552147730' },
  );
  await pending;
  expect(screen.getByText('student=s-1')).toBeTruthy();
  expect(pending.getPathname()).toBe('/inbox/subscribe');
});
