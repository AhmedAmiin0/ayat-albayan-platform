import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AppText } from '@ab/mobile-kit';
import { FamilyPage } from './FamilyPage';
import { showSwitched } from './switch-store';

// The switch note floats over the page so there is no layout shift.

test('the switch note floats at the bottom, outside the scrolling body', async () => {
  await render(
    <FamilyPage header={null} onRefresh={() => undefined}>
      <AppText>body</AppText>
    </FamilyPage>,
  );
  expect(screen.queryByTestId('switch-notice')).toBeNull();
  await act(() => showSwitched('تُعرض الآن صفحة سارة'));
  const note = screen.getByTestId('switch-notice');
  expect(StyleSheet.flatten(note.props.style)).toMatchObject({ position: 'absolute', start: 16 });
  expect(screen.getByText('تُعرض الآن صفحة سارة')).toBeTruthy();
});
