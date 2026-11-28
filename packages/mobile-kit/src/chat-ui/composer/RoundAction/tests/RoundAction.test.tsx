import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { shape } from '../../../../theme';
import { ComposerBar } from '../../ComposerBar';
import { RoundAction } from '../RoundAction';

const styleOf = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

test('44pt by default (the staff inbox); the channel asks for 48', async () => {
  await render(<RoundAction mode="mic" />);
  expect(styleOf('mic-circle')).toMatchObject({ width: 44, height: 44 });
  await render(<RoundAction mode="mic" size={shape.control.comfort} />);
  expect(styleOf('mic-circle')).toMatchObject({ width: 48, height: 48 });
  await render(<RoundAction mode="send" size={48} />);
  const send = screen.getByRole('button', { name: t.inbox.composer.send });
  expect(StyleSheet.flatten(send.props.style)).toMatchObject({ width: 48, height: 48 });
});

test('the pill keeps 44pt unless a size is given', async () => {
  await render(<ComposerBar pill={null} action={null} />);
  expect(styleOf('composer-pill').minHeight).toBe(44);
  await render(<ComposerBar pill={null} action={null} size={48} />);
  expect(styleOf('composer-pill').minHeight).toBe(48);
});
