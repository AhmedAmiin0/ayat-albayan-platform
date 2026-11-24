import type { TextStyle } from 'react-native';
import { shape, type, type useTheme } from '../../theme';

export const channelInputStyle = (color: ReturnType<typeof useTheme>['color']): TextStyle => ({
  minHeight: 44,
  maxHeight: 140,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: color.ruleInput,
  borderRadius: shape.radius.md,
  backgroundColor: color.raised,
  color: color.ink,
  fontFamily: type.ui[400],
  fontSize: type.size.body,
});
