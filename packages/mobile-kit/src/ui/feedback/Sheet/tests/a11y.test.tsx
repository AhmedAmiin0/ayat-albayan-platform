import { act, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { Sheet } from '../Sheet';

const L = t.mobileRoom.leaveAsk;
const mockOpener = createRef<View>();
const MOCK_OPENER = 7;
const MOCK_TITLE = 42;

// The test renderer has no native tags: the mockOpener and the title get one each here.
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: (x: unknown) => (x === mockOpener.current ? MOCK_OPENER : MOCK_TITLE),
}));

function frame(open: boolean) {
  return (
    <View>
      <View ref={mockOpener} testID="mockOpener" />
      <Sheet
        open={open}
        onClose={jest.fn()}
        testID="demo"
        label={L.title}
        title={L.title}
        returnFocus={mockOpener}
      >
        <Text>{L.body}</Text>
      </Sheet>
    </View>
  );
}

const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');

beforeEach(() => {
  jest.useFakeTimers();
  focus.mockReset().mockImplementation(() => undefined);
});
afterEach(() => jest.useRealTimers());

test('closed on mount: focus stays where it is', async () => {
  await render(frame(false));
  await act(() => jest.runAllTimers());
  expect(focus).not.toHaveBeenCalled();
});

test('opening moves the reader to the title once the sheet settles', async () => {
  const view = await render(frame(false));
  await view.rerender(frame(true));
  expect(focus).not.toHaveBeenCalled();
  await act(() => jest.runAllTimers());
  expect(focus).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledWith(MOCK_TITLE);
});

test('closing returns the reader to the control that opened it', async () => {
  const view = await render(frame(true));
  await act(() => jest.runAllTimers());
  focus.mockClear();
  await view.rerender(frame(false));
  await act(() => jest.runAllTimers());
  expect(focus).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledWith(MOCK_OPENER);
});

test('a quick close before the sheet settles never focuses the gone title', async () => {
  const view = await render(frame(false));
  await view.rerender(frame(true));
  await view.rerender(frame(false));
  await act(() => jest.runAllTimers());
  expect(focus).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledWith(MOCK_OPENER);
});
