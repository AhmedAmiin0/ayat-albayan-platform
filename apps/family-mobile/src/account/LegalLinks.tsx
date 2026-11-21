import { familyLegalUrl, LEGAL_PAGES } from '@ab/client-core';
import { InsetGroup, ListRow, openOutside, t } from '@ab/mobile-kit';

/**
 * «سياسة الخصوصية» and «حذف الحساب وبياناته» (owner 2026-11-21, Google Play): the family portal's
 * public pages, opened in the phone's browser (no sign-in needed there).
 */
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
