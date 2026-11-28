import { Linking } from 'react-native';
import type { BubblePartProps } from './BubblePart.types';

export const openPart = ({ href }: BubblePartProps['part']) =>
  void Linking.openURL(href ?? '').catch(() => undefined);
