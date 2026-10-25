import type { NotificationItem } from '@ab/shared';
import { leadAge } from '@/inbox/format';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';

export interface NotificationRowProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

/** One bell row: title, body, how long ago, and «غير مقروء» (glyph + word, never colour alone). */
export function NotificationRow({ item, onPress }: NotificationRowProps) {
  const { color } = useTheme();
  const tags = (
    <>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 }}>
        {leadAge(item.created_at)}
      </AppText>
      {item.read_at ? null : <StatusChip tone="act" glyph="fill" size="sm" label={t.bell.mobile.unread} />}
    </>
  );
  return <ListRow title={item.title} subtitle={item.body} tags={tags} onPress={() => onPress(item)} />;
}
