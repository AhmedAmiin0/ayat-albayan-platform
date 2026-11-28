// Stand-ins for @expo/ui in jest (jest.shared.cjs mocks the modules with these).
const { createElement, useState, useSyncExternalStore } = require('react');
const RN = require('react-native');

// The BottomSheet shows its children only while presented (the lesson room's participants; the
// family app's children sheet).
const BottomSheet = ({ isPresented, children, ...props }) =>
  isPresented
    ? createElement(RN.View, { testID: 'native-bottom-sheet', ...props }, children)
    : null;

const Host = ({ children, ...props }) =>
  createElement(RN.View, { testID: 'native-host', ...props }, children);
const RNHostView = ({ children, ...props }) => createElement(RN.View, props, children);

// The observable native text: one object for the field's life, as the native one is. Only the
// stand-in input re-renders on a write, as only the native view redraws; React never sees it.
const nativeState = (initial) => {
  const listeners = new Set();
  const state = {
    value: initial,
    get: () => state.value,
    set: (next) => {
      state.value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return state;
};
const useNativeState = (initial) => useState(() => nativeState(initial))[0];
const noState = { get: () => undefined, subscribe: () => () => undefined };
const useShown = (value) => {
  const state = value ?? noState;
  return useSyncExternalStore(state.subscribe, state.get);
};

const modifier = ($type) => (params) => ({ $type, params });
const swiftUiModifiers = {
  __esModule: true,
  accessibilityLabel: modifier('accessibilityLabel'),
  accessibilityHint: modifier('accessibilityHint'),
  frame: modifier('frame'),
};
const composeModifiers = {
  __esModule: true,
  semantics: modifier('semantics'),
  defaultMinSize: modifier('defaultMinSize'),
};

const paramOf = (modifiers, $type) => modifiers?.find((m) => m.$type === $type)?.params;

// The universal TextInput as React Native's: its iOS accessibility modifiers become the label and
// hint a test queries by, and the observable value its display value. Typing writes that value,
// as the native field does, before the callback. `expoUi` marks it.
const TextInput = ({ value, modifiers, onChangeText, onFocus, onBlur, ...props }) => {
  const shown = useShown(value);
  return createElement(RN.TextInput, {
    ...props,
    onChangeText: (text) => {
      value?.set(text);
      onChangeText?.(text);
    },
    expoUi: true,
    modifiers,
    value: shown,
    accessibilityLabel: paramOf(modifiers, 'accessibilityLabel'),
    accessibilityHint: paramOf(modifiers, 'accessibilityHint'),
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
    onSubmitEditing: () => props.onSubmitEditing?.(value?.get() ?? ''),
  });
};

module.exports = {
  universal: { __esModule: true, BottomSheet, Host, RNHostView, TextInput, useNativeState },
  swiftUiModifiers,
  composeModifiers,
};
