import type { ShortLinkDetail } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoleTag } from '@/features/platform/short-links/shared/PersonLine';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

const D = t.shortLinks.detail;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="inline-flex items-center gap-1.5 font-semibold">{children}</dd>
    </div>
  );
}

export function MetaLine({ link }: { link: ShortLinkDetail }) {
  const dates = useLinkDates();
  return (
    <dl className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Item label={D.expiresAt}>{dates.full(link.expiresAt)}</Item>
      {link.createdBy && (
        <Item label={D.owner}>
          {link.createdBy.name}
          <RoleTag role={link.createdBy.role} />
        </Item>
      )}
      <Item label={D.createdAt}>{dates.dayClock(link.createdAt)}</Item>
      <Item label={D.audience}>{t.shortLinks.audience[link.audience]}</Item>
    </dl>
  );
}
