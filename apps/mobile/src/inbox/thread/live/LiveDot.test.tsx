import { act, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@ab/shared';
import { inboxLive } from './inbox-live';
import { LiveDot } from './LiveDot';

afterEach(() => act(() => inboxLive.setLive(false)));

test('red and «غير متصل» while the channel is down; green and «متصل» once SUBSCRIBED (docs/44 K2)', async () => {
  await render(<LiveDot />);
  const off = screen.getByTestId('live-dot');
  expect(off.props.accessibilityLabel).toBe(t.inbox.liveOff);
  expect(off).toHaveStyle({ backgroundColor: palette.light.bad });
  await act(async () => inboxLive.setLive(true));
  const on = screen.getByTestId('live-dot');
  expect(on.props.accessibilityLabel).toBe(t.inbox.liveOn);
  expect(on).toHaveStyle({ backgroundColor: palette.light.ok });
});
