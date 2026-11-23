// Ours on the physical right, theirs on the left, in both directions; flex follows the page.
export const BUBBLE_ROW = {
  outbound: 'justify-end rtl:flex-row-reverse',
  inbound: 'justify-start rtl:flex-row-reverse',
} as const;
