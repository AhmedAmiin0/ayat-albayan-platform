import { familyLegalUrl, LEGAL_PAGES } from '@ab/client-core';
import { InsetGroup, ListRow, openOutside, t } from '@ab/mobile-kit';

/** Privacy policy and account deletion pages for Google Play, opened in the browser. */
export function LegalLinks() {
  const L = t.legal.links;
  return (
    <InsetGroup>
      {LEGAL_PAGES.map((page) => (
        <ListRow
          key={page}
          title={L[page]}
          accessibilityHint={L.opensBrowser}
          onPress={() => openOutside(familyLegalUrl(page))}
        />
      ))}
    </InsetGroup>
  );
}
