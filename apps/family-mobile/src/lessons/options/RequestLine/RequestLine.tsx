import { AppText, type } from '@ab/mobile-kit';
import type { RequestLineProps } from './RequestLine.types';
import { lineOf } from './request-line.helpers';

export function RequestLine(props: RequestLineProps) {
  const line = lineOf(props);
  if (!line) return null;
  return <AppText style={{ fontSize: type.size.xs, color: props.ink }}>{line}</AppText>;
}
