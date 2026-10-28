import { avatarTone, avatarTones, palette, type } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { Avatar } from './Avatar';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));
const scheme = jest.mocked(useColorScheme);

const bg = (testID: string): unknown => StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style).backgroundColor;

beforeEach(() => scheme.mockReturnValue('light'));

test('a photo: a round, fixed-size image named by the person', async () => {
  await render(<Avatar name="هدى سالم" id="t1" src="https://cdn/t1.jpg" size="lg" />);
  const photo = screen.getByRole('image', { name: 'هدى سالم' });
  expect(photo.props.source).toEqual({ uri: 'https://cdn/t1.jpg' });
  expect(StyleSheet.flatten(photo.props.style)).toMatchObject({ width: 64, height: 64, borderRadius: 32 });
});

test('no photo: the shared initials on the person’s light tone, still named by the person', async () => {
  await render(<Avatar name="الحسن علي" id="t1" />);
  expect(screen.getByRole('image', { name: 'الحسن علي' })).toBeTruthy();
  expect(screen.getByText('ح')).toBeTruthy();
  expect(bg('avatar-initials')).toBe(avatarTones.light[avatarTone('t1')]);
  expect(StyleSheet.flatten(screen.getByTestId('avatar-initials').props.style)).toMatchObject({ width: 36, height: 36 });
});

test('a photo that fails to load falls back to the initials at the same size', async () => {
  await render(<Avatar name="Sara Ahmed" id="u1" src="https://cdn/gone.jpg" size="sm" />);
  await fireEvent(screen.getByTestId('avatar-photo'), 'error');
  expect(screen.getByText('SA')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('avatar-initials').props.style)).toMatchObject({ width: 28, height: 28 });
});

test('dark mode: the dark tone of the same person', async () => {
  scheme.mockReturnValue('dark');
  await render(<Avatar name="هدى" id="t2" />);
  expect(bg('avatar-initials')).toBe(avatarTones.dark[avatarTone('t2')]);
});

test('one person, one tone: the same id gives the same colour whatever the name', async () => {
  await render(
    <>
      <Avatar name="هدى" id="same" />
      <Avatar name="Huda" id="same" />
    </>,
  );
  const [a, b] = screen.getAllByTestId('avatar-initials');
  expect(StyleSheet.flatten(a?.props.style).backgroundColor).toBe(StyleSheet.flatten(b?.props.style).backgroundColor);
});

test('no id: the name seeds the tone', async () => {
  await render(<Avatar name="هدى" />);
  expect(bg('avatar-initials')).toBe(avatarTones.light[avatarTone('هدى')]);
});

test('decorative (a row that reads the name): hidden from the screen reader', async () => {
  await render(<Avatar name="هدى" id="t1" decorative />);
  expect(screen.queryByRole('image')).toBeNull();
  expect(screen.getByTestId('avatar-initials', { includeHiddenElements: true })).toBeTruthy();
});

test('a hairline around the circle: rule-strong in light (web: the inset 1px rule)', async () => {
  await render(<Avatar name="هدى" id="t1" />);
  const frame = StyleSheet.flatten(screen.getByTestId('avatar-initials').props.style);
  expect(frame).toMatchObject({ borderWidth: StyleSheet.hairlineWidth, borderColor: palette.light.ruleStrong });
});

test('dark mode: the more visible rule-input hairline, photo or not', async () => {
  scheme.mockReturnValue('dark');
  await render(<Avatar name="هدى" id="t1" src="https://cdn/t1.jpg" />);
  expect(StyleSheet.flatten(screen.getByTestId('avatar-photo').props.style)).toMatchObject({ borderColor: palette.dark.ruleInput });
});

test('xl is 96 like the web, its initials in the display face; sm stays in the UI face', async () => {
  await render(
    <>
      <Avatar name="هدى" id="t1" size="xl" />
      <Avatar name="سارة" id="t2" size="sm" />
    </>,
  );
  expect(StyleSheet.flatten(screen.getAllByTestId('avatar-initials')[0]?.props.style)).toMatchObject({ width: 96, height: 96 });
  expect(StyleSheet.flatten(screen.getByText('ه').props.style).fontFamily).toBe(type.display);
  expect(StyleSheet.flatten(screen.getByText('س').props.style).fontFamily).toBe(type.ui[700]);
});

test('a name with no letter: the person glyph, as on the web', async () => {
  await render(<Avatar name="" id="t1" />);
  expect(screen.getByTestId('avatar-glyph')).toBeTruthy();
});
