import { bareUrl, linkStateLook } from '@ab/client-core';
import type { ShortLinkRow } from '@ab/shared';
import { View } from 'react-native';
import { t, ltr, ListRow, Note } from '@ab/mobile-kit';
import { LinkChip } from '@/short-links/ui/LinkChip';
import { expiryLine, usageLine } from '@/short-links/ui/link-words';

interface LinkCardProps {
  row: ShortLinkRow;
  /** The viewer's clock (expiry words). */
  viewer: { now: Date; tz: string };
  /** «المالك: …» on every card (short_links.all); null: the viewer's own links only. */
  me: string | null;
  onOpen: (code: string) => void;
}

const L = () => t.shortLinks.list;

function ownerName(row: ShortLinkRow, me: string): string {
  const owner = row.createdBy;
  return owner?.id === me ? L().you : (owner?.name ?? '');
}

/** «المالك: الزهراء · مستخدمون محددون», or the audience alone on the viewer's own list. */
function ownerLine(row: ShortLinkRow, me: string | null): string {
  const audience = t.shortLinks.audience[row.audience];
  if (me === null) return audience;
  return `${L().ownerLine.replace('{name}', ownerName(row, me))} · ${audience}`;
}

/** One link (board LinkXStaffList): title and state, the short URL, use and expiry, owner. */
export function LinkCard({ row, viewer, me, onOpen }: LinkCardProps) {
  const look = linkStateLook(row);
  const usage = `${L().visits} ${usageLine(row)} · ${expiryLine(row, viewer)}`;
  return (
    <ListRow
      title={row.title}
      subtitle={ltr(bareUrl(row.shortUrl))}
      trailing={<LinkChip tone={look.tone} label={t.shortLinks.state[look.key]} />}
      tags={
        <View style={{ gap: 2 }}>
          <Note>{usage}</Note>
          <Note>{ownerLine(row, me)}</Note>
        </View>
      }
      onPress={() => onOpen(row.code)}
    />
  );
}
