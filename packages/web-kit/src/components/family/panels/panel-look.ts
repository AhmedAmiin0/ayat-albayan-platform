// The family look of the child page's shared panels (boards PortalWebAttended, …Absent,
// …Recordings, …Package). Every visible class is `family:`-prefixed: the staff pages that render
// the same panels keep their look. Literal strings, so Tailwind's scanner sees them.

/** A month's title over a list: «◆ نوفمبر 2026», 19 px extra-bold ink. */
export const FAM_MONTH =
  'family:flex family:items-center family:gap-2.5 family:text-[19px] family:font-extrabold family:text-ink';

/** A month's list: two columns of row cards from a tablet up (boards: 12 px apart). */
export const FAM_ROWS = 'family:md:grid-cols-2';

/** A panel's empty state as a white card instead of the dashed box. */
export const FAM_EMPTY =
  'family:rounded-[20px] family:border-solid family:border-rule family:bg-raised family:shadow-fam-card';

/** «التسجيلات» and «الباقة» on a wide screen: the main card, then a column of the rest. */
export const FAM_SPLIT =
  'family:items-start family:lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] family:lg:gap-8';

/**
 * That side column. `contents` elsewhere: its children stay items of the panel's own grid, as
 * before the family look.
 */
export const FAM_SIDE = 'contents family:grid family:content-start family:gap-6';

type PanelEdge = 'green' | 'gold' | 'teal';

/** A panel card: 22 px corners, the cream hairline, a lifted shadow, the coloured top edge. */
export const FAM_CARD: Record<PanelEdge, string> = {
  green: 'family:rounded-[22px] family:border family:border-rule family:border-t-4 family:border-t-[var(--fam-edge-green)] family:bg-raised family:p-5 family:shadow-fam-lift family:sm:p-6',
  gold: 'family:rounded-[22px] family:border family:border-rule family:border-t-4 family:border-t-[var(--fam-edge-gold)] family:bg-raised family:p-5 family:shadow-fam-lift family:sm:p-6',
  teal: 'family:rounded-[22px] family:border family:border-rule family:border-t-4 family:border-t-[var(--fam-edge-teal)] family:bg-raised family:p-5 family:shadow-fam-lift family:sm:p-6',
};

/** A card's own title (boards: «سجل المدفوعات», 19 px extra-bold ink). */
export const FAM_CARD_TITLE = 'family:text-[19px] family:font-extrabold family:text-ink';
