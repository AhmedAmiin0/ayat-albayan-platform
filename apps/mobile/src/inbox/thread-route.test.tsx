import { useLocalSearchParams } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { TabStack } from '@/nav/TabStack';
import { threadHref } from './thread-cache';

// The real route file under the inbox tab, with a stub screen: proves the encoded + comes back.
function PhoneParam() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  return <Text>{`phone=${phone}`}</Text>;
}

test('a thread link (from a lead or a push) hands the screen the E.164 phone, + included', async () => {
  const pending = renderRouter(
    {
      'inbox/_layout': TabStack,
      'inbox/index': () => <Text>inbox</Text>,
      'inbox/[id]': () => <Text>lead</Text>,
      'inbox/thread/[phone]': PhoneParam,
    },
    { initialUrl: threadHref('+966552147730') },
  );
  await pending;
  expect(screen.getByText('phone=+966552147730')).toBeTruthy();
  expect(pending.getPathname()).toBe('/inbox/thread/+966552147730');
});
