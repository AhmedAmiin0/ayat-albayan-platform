import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SwipeReply } from '../SwipeReply';

test('without onReply the row is plain: its child alone, no swipe area and no reply icon', async () => {
  await render(
    <SwipeReply>
      <Text>bubble</Text>
    </SwipeReply>,
  );
  expect(screen.getByText('bubble')).toBeTruthy();
  expect(screen.queryByTestId('swipe-reply')).toBeNull();
  expect(screen.queryByTestId('swipe-reply-icon', { includeHiddenElements: true })).toBeNull();
});
