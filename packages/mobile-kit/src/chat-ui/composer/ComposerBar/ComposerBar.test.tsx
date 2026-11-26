import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { ComposerBar } from './ComposerBar';
import { RoundAction } from '../RoundAction';

test('the bar: the pill then the round button, a line over them', async () => {
  await render(
    <ComposerBar
      above={<Text>note</Text>}
      pill={<Text>box</Text>}
      action={<RoundAction mode="mic" />}
    />,
  );
  expect(screen.getByTestId('composer-pill')).toHaveTextContent('box');
  expect(screen.getByTestId('mic-circle')).toBeTruthy();
  expect(screen.getByText('note')).toBeTruthy();
});

test('«أرسل»: a filled button that sends, and stays still while disabled', async () => {
  const onSend = jest.fn();
  await render(<RoundAction mode="send" onSend={onSend} />);
  await fireEvent.press(screen.getByLabelText(t.inbox.composer.send));
  expect(onSend).toHaveBeenCalledTimes(1);
  await render(<RoundAction mode="send" disabled onSend={onSend} />);
  await fireEvent.press(screen.getByLabelText(t.inbox.composer.send));
  expect(onSend).toHaveBeenCalledTimes(1);
});
