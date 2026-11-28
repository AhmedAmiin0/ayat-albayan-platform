import { describe, expect, it, vi } from 'vitest';
import { OBSERVE_MARKER, observeModule } from './expo-observe';

const createElement = vi.fn((type: unknown, props: object) => ({ type, props }));
const View = 'View';
const fake = () => observeModule({ fn: (impl) => vi.fn(impl), createElement, View });

describe('the fake expo-observe module', () => {
  it('records configure calls for the test to read', () => {
    const { Observe } = fake();
    Observe.configure({ integrations: {} });
    expect(Observe.configure).toHaveBeenCalledWith({ integrations: {} });
  });

  it('wraps a layout into one that renders the layout with its props', () => {
    const Layout = () => null;
    const Wrapped = fake().ObserveRoot.wrap(Layout);
    expect(Wrapped({ a: 1 })).toEqual({ type: Layout, props: { a: 1 } });
  });

  it('renders the interactive marker as a probe view', () => {
    expect(fake().ObserveInteractiveMarker()).toEqual({
      type: View,
      props: { testID: OBSERVE_MARKER },
    });
  });
});
