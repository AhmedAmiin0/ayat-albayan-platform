import { LEGAL_UPDATED_ON } from '@ab/client-core';
import { AcademyContactLink, LegalDocument, LegalSection } from '@ab/web-kit/components/legal';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { legalContent } from '@/features/legal/legal-content';
import { LegalFooter } from '@/features/legal/LegalFooter';
import type { LegalPageProps } from './LegalPage.types';

/** Public, no sign-in (Google Play); the contact comes from settings.academy_contact. */
export function LegalPage({ page }: LegalPageProps) {
  const content = legalContent(page);
  return (
    <LegalDocument
      title={content.title}
      updated={t.legal.updated.replace('{date}', LEGAL_UPDATED_ON)}
      footer={<LegalFooter current={page} />}
    >
      <p className="text-body leading-relaxed text-pretty">{content.intro}</p>
      {content.sections.map((s) => (
        <LegalSection key={s.id} {...s}>
          {s.note ? <p className="text-pretty">{s.note}</p> : null}
          {s.withContact ? <AcademyContactLink fallback={t.legal.contactFallback} /> : null}
        </LegalSection>
      ))}
    </LegalDocument>
  );
}
