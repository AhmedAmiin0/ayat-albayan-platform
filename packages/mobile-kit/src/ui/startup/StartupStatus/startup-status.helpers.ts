import { type } from '../../../theme';

/** Always reserved under the status, so nothing moves when the hint and the retry come. */
export const RETRY_AREA = 112;
export const STATUS = type.size.body;
export const HINT = type.size.sm;

export const lineStyle = (size: number, color: string) => ({
  fontSize: size,
  lineHeight: type.lineHeight(size),
  color,
  textAlign: 'center' as const,
});
