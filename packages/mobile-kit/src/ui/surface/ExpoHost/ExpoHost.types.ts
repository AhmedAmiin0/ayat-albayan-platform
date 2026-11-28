import type { UniversalHostProps } from '@expo/ui';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface ExpoHostProps {
  children?: ReactNode;
  /** Sized to its native content (default); false fills the parent (a List, a FieldGroup). */
  matchContents?: UniversalHostProps['matchContents'];
  /** A left-to-right value (a phone, an email, a code) kept so inside an Arabic screen. */
  ltr?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export type ExpoHostView = Pick<
  UniversalHostProps,
  'colorScheme' | 'seedColor' | 'layoutDirection' | 'matchContents'
>;
