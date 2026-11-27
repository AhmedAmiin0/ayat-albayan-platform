import type { PressableStateCallbackType } from 'react-native';
import { shape, type } from '../../../theme';
import type { ListRowTitleProps } from './ListRowTitle.types';

const pressStyle = ({ pressed }: PressableStateCallbackType) => ({
  alignSelf: 'stretch' as const,
  opacity: pressed ? 0.6 : 1,
});

export function titleParts({ title, meta, metaStrong, link }: ListRowTitleProps) {
  const header = link !== undefined;
  const size = header ? type.size.lg : type.size.body;
  const lineHeight = type.lineHeight(size);
  const slop = Math.max(0, Math.ceil((shape.control.touch - lineHeight) / 2));
  const line = { title, meta, metaStrong, header, size, lineHeight };
  return { line, link, slop, pressStyle };
}
