export type FakeComponent = (props: object) => unknown;

/** What the fake needs from the test runner and React; jest passes jest.fn, react, react-native. */
export interface ObserveRuntime {
  fn: <A extends unknown[], R>(impl: (...args: A) => R) => (...args: A) => R;
  createElement: (type: unknown, props: object) => unknown;
  View: unknown;
}

export interface FakeObserveModule {
  Observe: { configure: (options: object) => void };
  ObserveRoot: { wrap: (Layout: FakeComponent) => FakeComponent };
  ObserveInteractiveMarker: () => unknown;
}
