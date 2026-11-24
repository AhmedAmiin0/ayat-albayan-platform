import { visitorLook } from '@ab/client-core';
import type { ShortLinkDetail, ShortLinkVisitor } from '@ab/shared';
import { t, useClockCycle, InsetGroup, Note, Section } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { usageLine, whenText } from '@/short-links/ui/link-words';
import { PersonRow } from '@/short-links/ui/PersonRow';

const D = () => t.shortLinks.detail;

function VisitorRow({ visitor }: { visitor: ShortLinkVisitor }) {
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const look = visitorLook(visitor);
  const family = look.family ? D().family.replace('{name}', look.family) : null;
  return (
    <PersonRow look={look} id={visitor.person?.id}>
      {family ? <Note>{family}</Note> : null}
      <Note>{`${D().via[look.via]} · ${whenText(visitor.lastAt, tz, cycle)}`}</Note>
    </PersonRow>
  );
}

/** Each distinct visitor once: a system user, or a number verified by a WhatsApp code. */
export function VisitorsList({ link }: { link: ShortLinkDetail }) {
  const visitors = link.visitorList;
  return (
    <Section title={`${D().visitors} · ${usageLine(link)}`}>
      <Note>{D().visitorsHint}</Note>
      {visitors.length === 0 ? <Note>{D().noVisitors}</Note> : null}
      <InsetGroup testID="link-visitors">
        {visitors.map((v) => (
          <VisitorRow key={`${v.kind}-${v.person?.id ?? v.phone ?? v.firstAt}`} visitor={v} />
        ))}
      </InsetGroup>
    </Section>
  );
}
