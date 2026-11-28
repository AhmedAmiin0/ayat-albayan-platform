import { palette } from '@ab/catalog';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import * as RN from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { Sheet } from '../Sheet';

const L = t.mobileRoom.leaveAsk;
const scheme = jest.spyOn(RN, 'useColorScheme');
const still = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');

beforeEach(() => {
  scheme.mockReturnValue('light');
  still.mockResolvedValue(false);
});

function draw(extra: { surface?: 'raised' | 'page'; size?: 'fit' | 'large' } = {}) {
  return render(
    <Sheet open onClose={jest.fn()} testID="demo" label={L.title} {...extra}>
      <Text>{L.body}</Text>
    </Sheet>,
  );
}

test('the raised surface and the scrim come from the theme tokens', async () => {
  await draw();
  const sheet = screen.getByTestId('demo');
  expect(sheet.props.containerColor).toBe(palette.light.raised);
  expect(sheet.props.scrimColor).toBe(palette.light.scrim);
});

test('dark scheme: the dark tokens; page surface for the lesson room', async () => {
  scheme.mockReturnValue('dark');
  await draw({ surface: 'page' });
  expect(screen.getByTestId('demo').props.containerColor).toBe(palette.dark.page);
});

test('Reduce Motion: a large sheet opens straight at full, no half step', async () => {
  still.mockResolvedValue(true);
  await draw({ size: 'large' });
  await waitFor(() => expect(screen.getByTestId('demo').props.snapPoints).toEqual(['full']));
});

test('RTL and LTR alike: the side padding is the same on both edges', async () => {
  await draw();
  const pad = screen.getByTestId('demo').props.contentPadding;
  expect(pad.left).toBe(pad.right);
});
