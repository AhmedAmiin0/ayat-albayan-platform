import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { PreviewNotice } from './PreviewNotice';

const P = t.mobileRoom.permission;

test('a refusal reads the denied words and offers no settings', async () => {
  await render(<PreviewNotice notice="denied" />);
  expect(screen.getByTestId('room-notice-denied')).toBeTruthy();
  expect(screen.getByText(P.denied)).toBeTruthy();
  expect(screen.queryByRole('button', { name: P.openSettings })).toBeNull();
});

test('a permanent refusal reads the blocked words and opens the settings', async () => {
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await render(<PreviewNotice notice="blocked" />);
  expect(screen.getByText(P.blocked)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.openSettings }));
  expect(open).toHaveBeenCalledTimes(1);
});
