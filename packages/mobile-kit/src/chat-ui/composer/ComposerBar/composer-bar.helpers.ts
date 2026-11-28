import { shape } from '../../../theme';

export const PILL = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'flex-end',
  minHeight: shape.control.touch,
  borderRadius: shape.radius.pill,
  borderWidth: 1,
  paddingHorizontal: 2,
} as const;
