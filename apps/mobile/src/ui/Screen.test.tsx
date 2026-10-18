import { render, screen, within } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { Screen } from './Screen';

test('scroll: the rows sit in a ScrollView, so the last one («تسجيل الخروج») can always be reached', async () => {
  await render(
    <Screen scroll>
      <Text>first</Text>
      <Text>last</Text>
    </Screen>,
  );
  const scroller = screen.UNSAFE_getByType(ScrollView);
  expect(within(scroller).getByText('last')).toBeTruthy();
});

test('default: no ScrollView (a FlatList placed last does the scrolling)', async () => {
  await render(
    <Screen>
      <Text>row</Text>
    </Screen>,
  );
  expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  expect(screen.getByText('row')).toBeTruthy();
});
