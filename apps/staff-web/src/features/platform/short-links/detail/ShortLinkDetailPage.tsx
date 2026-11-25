import type { ShortLinkDetail } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon, ListSkeleton, FormAlert, Toast, t } from '@ab/web-kit';
import { useLinkDetail } from '@/features/platform/short-links/api/use-short-links';
import { EditLinkDialog } from '@/features/platform/short-links/edit/EditLinkDialog';
import { ExtendDialog } from '@/features/platform/short-links/edit/ExtendDialog';
import { RevokeDialog } from '@/features/platform/short-links/edit/RevokeDialog';
import { failureText, useLinkActions } from '@/features/platform/short-links/edit/use-link-actions';
import { LINK_ROUTES, type LinkSection } from '@/features/platform/short-links/shared/link-routes';
import { DetailHead } from './DetailHead';
import { MetaLine } from './MetaLine';
import { QrCard } from './QrCard';
import { StatCards } from './StatCards';
import { TargetCard } from './TargetCard';
import { UsersTable } from './UsersTable';
import { VisitorsTable } from './VisitorsTable';

const D = t.shortLinks.detail;

export interface ShortLinkDetailPageProps {
  section: LinkSection;
  code: string;
}

function LinkView({ link }: { link: ShortLinkDetail }) {
  const actions = useLinkActions(link.code);
  const live = link.status !== 'revoked';
  const close = () => actions.setDialog(null);
  return (
    <>
      <DetailHead
        link={link}
        onDialog={actions.setDialog}
        onResend={actions.resend}
        pending={actions.pending}
      />
      <MetaLine link={link} />
      {actions.failure && actions.dialog === null && (
        <FormAlert className="mb-4">{actions.failure}</FormAlert>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_2fr]">
        <QrCard link={link} />
        <div className="grid content-start gap-4">
          <StatCards link={link} />
          <TargetCard link={link} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <UsersTable link={link} onResend={live ? actions.resend : null} pending={actions.pending} />
        <VisitorsTable link={link} />
      </div>
      {actions.dialog === 'extend' && (
        <ExtendDialog link={link} onClose={close} onSaved={actions.saved} />
      )}
      {actions.dialog === 'edit' && (
        <EditLinkDialog link={link} onClose={close} onSaved={actions.saved} />
      )}
      {actions.dialog === 'revoke' && (
        <RevokeDialog
          onConfirm={actions.revoke}
          onClose={close}
          pending={actions.pending}
          failure={actions.failure}
        />
      )}
      {actions.notice && <Toast message={actions.notice} onDismiss={actions.clearNotice} />}
    </>
  );
}

/** One link (board LinkXWebDetail): its QR, numbers, users with their sends, and visitors. */
export function ShortLinkDetailPage({ section, code }: ShortLinkDetailPageProps) {
  const link = useLinkDetail(code);
  return (
    <>
      <Link
        to={LINK_ROUTES[section].list}
        className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-lapis hover:underline"
      >
        <Icon name="chevron-right" />
        {D.back}
      </Link>
      {link.isError && <FormAlert>{failureText(link.error)}</FormAlert>}
      {link.isPending && <ListSkeleton />}
      {link.data && <LinkView link={link.data} />}
    </>
  );
}
