import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
} from 'react-native';

// Test-only. react-native's index requires each component lazily, on its first use: in a big screen's
// first test that is ~150 modules (Modal, ScrollView, TextInput, Animated and the renderer behind them)
// to transform and evaluate inside that test's timeout, which a cold cache under a full parallel
// `turbo test` can push past 30 s. Importing this file first pays that while the test file loads.
// It only reads the exports (no render, no state), so every test still starts clean.

export const warmedComponents = [
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
] as const;
