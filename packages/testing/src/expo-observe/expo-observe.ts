// expo-observe has no native module under jest. Wire it in an app's jest setup with
//   jest.mock('expo-observe', () => jest.requireActual('@ab/testing/expo-observe').observeModule({
//     fn: jest.fn, createElement: jest.requireActual('react').createElement,
//     View: jest.requireActual('react-native').View }));
// The wrap renders the layout as is; the interactive marker renders a probe a test can find.

import type { FakeComponent, FakeObserveModule, ObserveRuntime } from './expo-observe.types';

export const OBSERVE_MARKER = 'observe-interactive';

export function observeModule({ fn, createElement, View }: ObserveRuntime): FakeObserveModule {
  const wrap =
    (Layout: FakeComponent): FakeComponent =>
    (props) =>
      createElement(Layout, props);
  return {
    Observe: { configure: fn(() => undefined) },
    ObserveRoot: { wrap: fn(wrap) },
    ObserveInteractiveMarker: () => createElement(View, { testID: OBSERVE_MARKER }),
  };
}
