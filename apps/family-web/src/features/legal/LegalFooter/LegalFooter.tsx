import { LEGAL_PATHS } from '@ab/client-core';
import { Link } from '@tanstack/react-router';
import { LanguageSwitch, t } from '@ab/web-kit';
import type { LegalFooterProps } from './LegalFooter.types';
import { FOOTER_LINK_CLASS } from '@/features/legal/legal-content';
import { otherLegalPages } from './legal-footer.helpers';

/** Under a legal page: the other legal page, sign-in, then the other language. */
export function LegalFooter({ current }: LegalFooterProps) {
  const others = otherLegalPages(current);
  return (
    <>
      {others.map((page) => (
        <Link key={page} to={LEGAL_PATHS[page]} className={FOOTER_LINK_CLASS}>
          {t.legal.links[page]}
        </Link>
      ))}
      <Link to="/login" className={FOOTER_LINK_CLASS}>
        {t.legal.links.signIn}
      </Link>
      <LanguageSwitch className="ms-auto" />
    </>
  );
}
