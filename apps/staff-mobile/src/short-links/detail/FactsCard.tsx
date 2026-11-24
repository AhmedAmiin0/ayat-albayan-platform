import { sendCounts, sendLook } from '@ab/client-core';
import { SHORT_LINK_SEND_STATUSES, type ShortLinkDetail } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  t,
  raisedCard,
  type,
  useClockCycle,
  useNow,
  useTheme,
  AppText,
  Button,
  ErrorLine,
  Note,
} from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { useResendLink } from '@/short-links/api/link-hooks';
import { LinkChip } from '@/short-links/ui/LinkChip';
import { expiryLine, usageLine, whenText } from '@/short-links/ui/link-words';

const D = () => t.shortLinks.detail;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  const { color } = useTheme();
  const row = { flexDirection: 'row', justifyContent: 'space-between', gap: 12 } as const;
  return (
    <View style={row}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{label}</AppText>
      <AppText
        style={{
          flexShrink: 1,
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          color: color.ink,
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

function SendFacts({ link }: { link: ShortLinkDetail }) {
  const resend = useResendLink();
  const counts = sendCounts(link.userList);
  const shown = SHORT_LINK_SEND_STATUSES.filter((s) => counts[s] > 0);
  const label =
    counts.failed > 0 ? D().resendFailed.replace('{n}', String(counts.failed)) : D().resend;
  const sent = resend.data?.send;
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontSize: type.size.sm }}>{D().whatsapp}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {shown.map((s) => (
          <LinkChip
            key={s}
            look={sendLook(s)}
            label={`${t.shortLinks.send[s]} ${counts[s]}`}
          />
        ))}
      </View>
      {link.status === 'active' ? (
        <Button
          variant="secondary"
          label={label}
          busy={resend.isPending}
          onPress={() => resend.mutate(link.code)}
        />
      ) : null}
      {sent ? (
        <Note alert>
          {D()
            .sendResult.replace('{queued}', String(sent.queued))
            .replace('{failed}', String(sent.failed))}
        </Note>
      ) : null}
      {resend.isError ? <ErrorLine message={D().errors.generic} /> : null}
    </View>
  );
}

/** The visits against the limit, when it ends, and the WhatsApp sends (board LinkXStaffDetail). */
export function FactsCard({ link }: { link: ShortLinkDetail }) {
  const { color } = useTheme();
  const viewer = { now: useNow(), tz: useViewerTz() };
  const cycle = useClockCycle();
  return (
    <View style={{ ...raisedCard(color, 20), gap: 12, padding: 16 }}>
      <Fact label={t.shortLinks.list.visits}>{usageLine(link)}</Fact>
      <Fact label={D().expiresAt}>{whenText(link.expiresAt, viewer.tz, cycle)}</Fact>
      <Fact label={D().remaining}>{expiryLine(link, viewer)}</Fact>
      {link.userList.length > 0 ? <SendFacts link={link} /> : null}
    </View>
  );
}
