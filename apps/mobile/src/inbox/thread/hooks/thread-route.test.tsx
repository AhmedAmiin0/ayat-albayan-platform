import { useLocalSearchParams } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ChatStack } from '@/core/nav/ChatStack';
import { TabStack } from '@/core/nav/TabStack';
import { threadHref } from './thread-cache';

// The real layout's shape with a stub screen: the thread lives in (admin-chat), above the tabs, under
// the same URL; proves the encoded + comes back.
function PhoneParam() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  return <Text>{`phone=${phone}`}</Text>;
}

test('a thread link (from a lead or a push) hands the screen the E.164 phone, + included', async () => {
  const pending = renderRouter(
    {
      _layout: TabStack,
      '(tabs)/inbox/_layout': TabStack,
      '(tabs)/inbox/index': () => <Text>inbox</Text>,
      '(tabs)/inbox/[id]': () => <Text>lead</Text>,
      '(admin-chat)/_layout': ChatStack,
      '(admin-chat)/inbox/thread/[phone]': PhoneParam,
    },
    { initialUrl: threadHref('+966552147730') },
  );
  await pending;
  expect(screen.getByText('phone=+966552147730')).toBeTruthy();
  expect(pending.getPathname()).toBe('/inbox/thread/+966552147730');
  expect(pending.getSegments()[0]).toBe('(admin-chat)');
});
