// Stand-ins for @expo/ui in jest (jest.shared.cjs mocks the modules with these).
const { createElement, useState } = require('react');
const RN = require('react-native');

// The BottomSheet shows its children only while presented (the lesson room's participants; the
// family app's children sheet).
const BottomSheet = ({ isPresented, children, ...props }) =>
  isPresented
    ? createElement(RN.View, { testID: 'native-bottom-sheet', ...props }, children)
    : null;

const Host = ({ children, ...props }) =>
  createElement(RN.View, { testID: 'native-host', ...props }, children);

// The observable native text: a React state here, so a write re-renders the field that owns it.
const useNativeState = (initial) => {
  const [value, set] = useState(initial);
  return { value, get: () => value, set };
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
const TextInput = ({ value, modifiers, onChangeText, onFocus, onBlur, ...props }) =>
  createElement(RN.TextInput, {
    ...props,
    onChangeText: (text) => {
      value?.set(text);
      onChangeText?.(text);
    },
    expoUi: true,
    modifiers,
    value: value?.value,
    accessibilityLabel: paramOf(modifiers, 'accessibilityLabel'),
    accessibilityHint: paramOf(modifiers, 'accessibilityHint'),
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
    onSubmitEditing: () => props.onSubmitEditing?.(value?.value ?? ''),
  });

module.exports = {
  universal: { __esModule: true, BottomSheet, Host, TextInput, useNativeState },
  swiftUiModifiers,
  composeModifiers,
};
