import type { NotificationItem } from '@ab/shared';
import { leadAge } from '@/inbox/shared/format';
import { t, type, useTheme, AppText, ListRow, StatusChip } from '@ab/mobile-kit';

interface NotificationRowProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

/** Unread is shown with glyph and word, never colour alone. */
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
