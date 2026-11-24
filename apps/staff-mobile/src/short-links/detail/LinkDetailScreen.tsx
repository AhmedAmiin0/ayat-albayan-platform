import { apiErrorCode, linkStateLook } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { ActivityIndicator } from 'react-native';
import {
  t,
  useClockCycle,
  useTheme,
  BackButton,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { useShortLink } from '@/short-links/api/link-hooks';
import { LinkChip } from '@/short-links/ui/LinkChip';
import { whenText } from '@/short-links/ui/link-words';
import { backToList } from '@/short-links/ui/routes';
import { FactsCard } from './FactsCard';
import { LinkActions } from './LinkActions';
import { QrCard } from './QrCard';
import { UsersList } from './UsersList';
import { VisitorsList } from './VisitorsList';

interface LinkDetailScreenProps {
  code: string;
  /** This tree's list route (back). */
  base: string;
}

const D = () => t.shortLinks.detail;

function useOwnerLine(link: ShortLinkDetail): string {
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const owner = `${D().owner}: ${link.createdBy?.name ?? ''}`;
  return `${owner} · ${D().createdAt} ${whenText(link.createdAt, tz, cycle)}`;
}

function LinkPage({ link, base }: { link: ShortLinkDetail; base: string }) {
  const look = linkStateLook(link);
  const ownerLine = useOwnerLine(link);
  return (
    <Screen scroll>
      <ScreenHeader
        title={link.title}
        size="h2"
        subtitle={ownerLine}
        leading={<BackButton onPress={() => backToList(base)} />}
      />
      <LinkChip look={look} label={t.shortLinks.state[look.key]} />
      <QrCard link={link} />
      <FactsCard link={link} />
      <LinkActions link={link} />
      <UsersList link={link} />
      <VisitorsList link={link} />
    </Screen>
  );
}

const errorWords = (e: unknown): string =>
  apiErrorCode(e) === 'short_link_not_found' ? D().errors.not_found : D().errors.generic;

/**
 * A link's page (board LinkXStaffDetail, docs/19): state and owner, the QR code with share and
 * copy, visits and expiry, the WhatsApp sends and resend, edit and revoke, users and visitors.
 */
export function LinkDetailScreen({ code, base }: LinkDetailScreenProps) {
  const { color } = useTheme();
  const link = useShortLink(code);
  if (link.data) return <LinkPage link={link.data} base={base} />;
  return (
    <Screen>
      <ScreenHeader
        title={t.shortLinks.title}
        leading={<BackButton onPress={() => backToList(base)} />}
      />
      {link.isError ? (
        <ErrorState message={errorWords(link.error)} onRetry={() => void link.refetch()} />
      ) : (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />
      )}
    </Screen>
  );
}
