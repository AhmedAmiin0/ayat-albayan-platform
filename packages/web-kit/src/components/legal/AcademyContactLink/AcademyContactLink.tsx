import { contactLine } from '@ab/client-core';
import { usePublicConfig } from '@ab/web-kit/lib/settings/public-config';
import type { AcademyContactLinkProps } from './AcademyContactLink.types';
import { CONTACT_TARGET } from '@ab/web-kit/components/legal/legal-look';

/**
 * How to reach the academy, from settings.academy_contact (GET /settings/public, the shared
 * query): its email, else its site, as an LTR link; `fallback` when neither is usable.
 */
export function AcademyContactLink({ fallback }: AcademyContactLinkProps) {
  const line = contactLine(usePublicConfig().academy_contact);
  return line ? (
    <a
      href={line.href}
      dir="ltr"
      className="font-semibold text-accent underline underline-offset-4"
      {...CONTACT_TARGET[line.kind]}
    >
      {line.text}
    </a>
  ) : (
    <span>{fallback}</span>
  );
}
