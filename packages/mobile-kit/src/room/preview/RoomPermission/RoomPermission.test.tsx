import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { RoomPermission } from './RoomPermission';

const P = t.mobileRoom.permission;

test('the ask explains why, allows and skips', async () => {
  const onAllow = jest.fn();
  const onSkip = jest.fn();
  await render(<RoomPermission onAllow={onAllow} onSkip={onSkip} onBrowser={null} />);
  expect(screen.getByRole('header', { name: P.title })).toBeTruthy();
  expect(screen.getByText(P.body)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.allow }));
  await fireEvent.press(screen.getByRole('button', { name: P.skip }));
  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: t.mobileRoom.openInBrowser })).toBeNull();
});

test('with a browser way out, it offers the browser', async () => {
  const onBrowser = jest.fn();
  await render(<RoomPermission onAllow={jest.fn()} onSkip={jest.fn()} onBrowser={onBrowser} />);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.openInBrowser }));
  expect(onBrowser).toHaveBeenCalledTimes(1);
});
