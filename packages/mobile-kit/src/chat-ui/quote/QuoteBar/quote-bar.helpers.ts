import { shape, type } from '../../../theme';

export const BAR = {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: shape.control.touch,
  paddingStart: 10,
  borderStartWidth: 3,
  borderRadius: shape.radius.sm,
} as const;

export const LINE = { fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) };
