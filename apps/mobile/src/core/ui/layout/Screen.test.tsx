import { render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FullScreenProvider, Screen } from './Screen';

// The safe-area host gets every edge as additive / off (SafeAreaView turns the edges list into that).
const bottom = () => screen.toJSON()?.props.edges?.bottom;

test('scroll: the rows sit in a ScrollView, so the last one («تسجيل الخروج») can always be reached', async () => {
  await render(
    <Screen scroll>
      <Text>first</Text>
      <Text>last</Text>
    </Screen>,
  );
  const scroller = screen.getByTestId('screen-scroll');
  expect(within(scroller).getByText('last')).toBeTruthy();
});

test('default: no ScrollView (a FlatList placed last does the scrolling)', async () => {
  await render(
    <Screen>
      <Text>row</Text>
    </Screen>,
  );
  expect(screen.queryByTestId('screen-scroll')).toBeNull();
  expect(screen.getByText('row')).toBeTruthy();
});

test('the bottom safe area: off in a tab screen (the tab bar owns it), on for a chat and under FullScreenProvider', async () => {
  await render(
    <Screen>
      <Text>tab</Text>
    </Screen>,
  );
  expect(bottom()).toBe('off');
  await render(
    <Screen chat>
      <Text>chat</Text>
    </Screen>,
  );
  expect(bottom()).toBe('additive');
  await render(
    <FullScreenProvider value>
      <Screen>
        <Text>book</Text>
      </Screen>
    </FullScreenProvider>,
  );
  expect(bottom()).toBe('additive');
  expect(screen.toJSON()?.props.edges?.top).toBe('additive');
});
