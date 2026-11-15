import { useLocalSearchParams } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ChatStack } from '@/core/nav/ChatStack';
import { TabStack } from '@/core/nav/TabStack';

// The real layout's shape with stub screens: /inbox/subscribe is its own screen, not a lead id.
function StudentParam() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <Text>{`student=${studentId}`}</Text>;
}

test('the chat’s «جدّد» link opens the subscribe screen (in the chat group) with its student, not the tabs’ lead [id]', async () => {
  const pending = renderRouter(
    {
      _layout: TabStack,
      '(tabs)/inbox/_layout': TabStack,
      '(tabs)/inbox/index': () => <Text>inbox</Text>,
      '(tabs)/inbox/[id]': () => <Text>lead</Text>,
      '(admin-chat)/_layout': ChatStack,
      '(admin-chat)/inbox/subscribe': StudentParam,
    },
    { initialUrl: '/inbox/subscribe?studentId=s-1&phone=%2B966552147730' },
  );
  await pending;
  expect(screen.getByText('student=s-1')).toBeTruthy();
  expect(pending.getPathname()).toBe('/inbox/subscribe');
  expect(pending.getSegments()[0]).toBe('(admin-chat)');
});

test('the student file’s «جدّد الاشتراك» opens the subscribe screen in the students tab, not a student id', async () => {
  const pending = renderRouter(
    {
      'students/_layout': TabStack,
      'students/index': () => <Text>students</Text>,
      'students/[id]': () => <Text>student</Text>,
      'students/subscribe': StudentParam,
    },
    { initialUrl: '/students/subscribe?studentId=s-1&renew=1&pkg=8&minutes=60' },
  );
  await pending;
  expect(screen.getByText('student=s-1')).toBeTruthy();
  expect(pending.getPathname()).toBe('/students/subscribe');
});
