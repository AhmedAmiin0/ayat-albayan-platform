import type { ProfileFact } from '@ab/client-core';
import { Ltr, Card, SectionHeader } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';

/** A phone, email or code reads left to right in an isolate; a name in the page's direction. */
function FactValue({ fact }: { fact: ProfileFact }) {
  return fact.ltr ? <Ltr>{fact.value}</Ltr> : <>{fact.value}</>;
}

/**
 * «بياناتي», read-only: the phone is the WhatsApp sign-in and the academy keeps the names, so the
 * note under it says who changes them.
 */
export function ProfileDetails({ facts }: { facts: readonly ProfileFact[] }) {
  const P = t.portal.app.profile;
  return (
    <Card asChild>
      <section aria-labelledby="profile-details" className="grid gap-1 pt-2">
        <SectionHeader id="profile-details" title={P.details} className="px-4" />
        <dl className="divide-y divide-rule">
          {facts.map((fact) => (
            <div key={fact.label} className="grid min-h-14 content-center gap-0.5 px-4 py-2">
              <dt className="text-xs text-ink-3">{fact.label}</dt>
              <dd className="font-semibold text-ink">
                <FactValue fact={fact} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-rule px-4 py-3 text-xs text-ink-3">{P.note}</p>
      </section>
    </Card>
  );
}
