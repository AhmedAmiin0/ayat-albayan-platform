import { AppText, type, useTheme } from '@ab/mobile-kit';
import type { NoticeProps } from './Notice.types';

/** What the row says once an action lands. */
export function Notice({ notice }: NoticeProps) {
  const { color } = useTheme();
  if (!notice) return null;
  return (
    <AppText accessibilityLiveRegion="polite" style={{ fontSize: type.size.xs, color: color.ok }}>
      {notice}
    </AppText>
  );
}
