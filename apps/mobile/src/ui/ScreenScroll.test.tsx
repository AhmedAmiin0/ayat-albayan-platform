import { render, screen } from '@testing-library/react-native';
import { AppText } from './AppText';
import { ScreenScroll } from './ScreenScroll';

// On iOS the native tabs inset only a screen's first scroll view; this body comes after the header,
// so it asks UIKit for its bottom safe area (tab bar + home indicator) itself, or the last block
// («تسجيل الخروج») ends under the tab bar.
test('the body takes the iOS safe-area insets, so its end clears the tab bar', async () => {
  await render(
    <ScreenScroll>
      <AppText>تسجيل الخروج</AppText>
    </ScreenScroll>,
  );
  const body = screen.getByTestId('screen-scroll');
  expect(body.props.contentInsetAdjustmentBehavior).toBe('automatic');
  expect(body.props.automaticallyAdjustsScrollIndicatorInsets).toBe(true);
  expect(screen.getByText('تسجيل الخروج')).toBeTruthy();
});

test('full-bleed rows still reach the edges; the content keeps the gutter and room at the end', async () => {
  await render(
    <ScreenScroll>
      <AppText>المزيد</AppText>
    </ScreenScroll>,
  );
  const body = screen.getByTestId('screen-scroll');
  expect(body).toHaveStyle({ flex: 1, marginHorizontal: -16 });
  expect(body.props.contentContainerStyle).toEqual({ paddingHorizontal: 16, paddingBottom: 32, gap: 16 });
});
