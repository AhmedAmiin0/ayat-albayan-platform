/**
 * The family look of a horizontal tab strip (boards PortalWebHome, PortalPhoneHome): a white
 * rounded-full bar with a soft lift, the selected tab a filled green pill, 44 px tall, the strip
 * scrolling sideways on a phone. `family:` only (data-skin=family): staff pages never change.
 */
export const FAMILY_STRIP =
  'family:mb-0 family:max-w-full family:gap-1 family:rounded-full family:border family:border-rule family:bg-raised family:p-[5px] family:shadow-fam-lift family:[scrollbar-width:none]';

export const FAMILY_TAB =
  'family:mb-0 family:flex family:items-center family:rounded-full family:border-0 family:px-4 family:py-0 family:text-[15px] family:font-bold family:text-ink-2 sm:family:px-6 family:transition-[background-color,color,box-shadow] family:hover:not-aria-selected:bg-sunk family:aria-selected:bg-lapis-fill family:aria-selected:font-extrabold family:aria-selected:text-white family:aria-selected:shadow-[0_6px_14px_rgba(4,120,87,0.22)]';

/** The unread badge on the selected (green) family tab turns white. */
export const FAMILY_BADGE =
  'family:in-aria-selected:bg-white family:in-aria-selected:text-[#047857]';
