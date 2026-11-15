// The app's calm surfaces (docs/29, Today first; owner 2026-10-28: one container rule for every screen): a `raised` card lifted by a hairline shadow, no border.

/** A 0.5pt ring in the theme's rule colour and a 2pt soft drop. */
export const hairline = (rule: string) => `0 0 0 0.5px ${rule}, 0 1px 2px rgba(23, 32, 28, 0.06)`;

/** A raised card: its fill, radius and hairline shadow. */
export const raisedCard = (color: { raised: string; rule: string }, radius = 20) => ({
  backgroundColor: color.raised,
  borderRadius: radius,
  boxShadow: hairline(color.rule),
});
