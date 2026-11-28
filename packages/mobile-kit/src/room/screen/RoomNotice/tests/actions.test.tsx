import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { RoomNotice } from '../RoomNotice';

test('again, the browser and back each call their own handler', async () => {
  const again = { label: 'again', onPress: jest.fn() };
  const browser = { label: 'browser', onPress: jest.fn() };
  const onBack = jest.fn();
  await render(
    <RoomNotice testID="n" message="m" again={again} browser={browser} onBack={onBack} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'again' }));
  await fireEvent.press(screen.getByRole('button', { name: 'browser' }));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.back }));
  expect(again.onPress).toHaveBeenCalledTimes(1);
  expect(browser.onPress).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('no way back in: only the buttons given show', async () => {
  await render(<RoomNotice testID="n" message="m" onBack={jest.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
