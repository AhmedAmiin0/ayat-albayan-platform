// Which side a bubble's row sits on (owner 2026-10-26 «make it like WhatsApp»): ours on the physical
// right, the family's on the physical left, in Arabic and English alike. Flex follows the page
// direction, so an RTL page reverses the row: its main axis then runs left to right as in English.
// The row keeps its order (ours: actions, bubble; theirs: bubble, actions), so the «رد» / menu
// buttons always sit on the bubble's centre side.
export const BUBBLE_ROW = {
  outbound: 'justify-end rtl:flex-row-reverse',
  inbound: 'justify-start rtl:flex-row-reverse',
} as const;
