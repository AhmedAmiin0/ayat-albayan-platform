import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { palette } from '../../../theme';
import { RoundButton } from './RoundButton';
import { useRoundButton } from './use-round-button';

const color = palette.light;
const icon = (ink: string) => <Text testID="icon">{ink}</Text>;

test('a 64pt circle named by its word, which calls onPress; readers skip the word', async () => {
  const onPress = jest.fn();
  await render(<RoundButton label="رد" tone="accept" onPress={onPress} icon={icon} />);
  const button = screen.getByRole('button', { name: 'رد' });
  expect(button).toHaveStyle({ width: 64, height: 64, borderRadius: 32, opacity: 1 });
  expect(button.props.accessibilityState?.selected).toBeUndefined();
  expect(screen.getByText('رد').props.importantForAccessibility).toBe('no');
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test.each([
  ['end', color.badSolid, color.onBad],
  ['accept', color.lapisFill, color.onLapis],
] as const)('%s is solid, with no outline', async (tone, fill, ink) => {
  await render(<RoundButton label="x" tone={tone} onPress={jest.fn()} icon={icon} />);
  const button = screen.getByRole('button', { name: 'x' });
  expect(button).toHaveStyle({ backgroundColor: fill });
  expect(button).not.toHaveStyle({ borderWidth: 1.5 });
  expect(screen.getByTestId('icon')).toHaveTextContent(ink);
});

test('plain is outlined in the cover ink and stays clear until pressed', async () => {
  await render(<RoundButton label="x" tone="plain" onPress={jest.fn()} icon={icon} />);
  const button = screen.getByRole('button', { name: 'x' });
  expect(button).toHaveStyle({
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: color.coverInk,
  });
  expect(screen.getByTestId('icon')).toHaveTextContent(color.coverInk);
});

test('a plain toggle reads out its state and fills when pressed', async () => {
  await render(<RoundButton label="x" tone="plain" pressed onPress={jest.fn()} icon={icon} />);
  const button = screen.getByRole('button', { name: 'x' });
  expect(button.props.accessibilityState).toEqual({ selected: true });
  expect(button).toHaveStyle({ backgroundColor: color.coverInk });
  expect(screen.getByTestId('icon')).toHaveTextContent(color.cover);
});

test('an unpressed toggle reads out «not selected»', async () => {
  await render(
    <RoundButton label="x" tone="plain" pressed={false} onPress={jest.fn()} icon={icon} />,
  );
  const button = screen.getByRole('button', { name: 'x' });
  expect(button.props.accessibilityState).toEqual({ selected: false });
});

test('the spoken name may say more than the word under the circle', async () => {
  const props = { label: 'x', tone: 'end', onPress: jest.fn(), icon } as const;
  await render(<RoundButton {...props} accessibilityLabel="إنهاء المكالمة" />);
  expect(screen.getByRole('button', { name: 'إنهاء المكالمة' })).toBeOnTheScreen();
});

test('the circle dims while a finger is down', async () => {
  const { result } = await renderHook(() => useRoundButton({ tone: 'end' }));
  expect(result.current.pressStyle({ pressed: true })).toMatchObject({ opacity: 0.85 });
  expect(result.current.pressStyle({ pressed: false })).toMatchObject({ opacity: 1 });
});
