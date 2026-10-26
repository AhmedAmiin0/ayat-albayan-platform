import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

// Line icons from the reference sprite (docs/design/ink-and-gold.html): 20px grid, 1.6 stroke.
// Directional icons are picked for RTL: «السابق» uses chevron-right, «التالي» chevron-left, and
// logout is drawn RTL-native; MIRROR flips them in an LTR page. `reply` is drawn for LTR.
const PATHS = {
  search: 'M14.5 9a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM13.2 13.2l3.6 3.6',
  plus: 'M10 4.5v11M4.5 10h11',
  minus: 'M4.5 10h11',
  more: 'M10 4.8h.01M10 10h.01M10 15.2h.01',
  menu: 'M3.5 5.5h13M3.5 10h13M3.5 14.5h13',
  'chevron-left': 'M12.5 5 7.5 10l5 5',
  'chevron-right': 'm7.5 5 5 5-5 5',
  /** Not directional: «تصغير» of the call screen (docs/28). */
  'chevron-down': 'm5 7.5 5 5 5-5',
  x: 'm5.5 5.5 9 9M14.5 5.5l-9 9',
  check: 'm4.5 10.5 3.5 3.5 7.5-8',
  chat: 'M10 3.5a6.5 6.5 0 0 0-5.6 9.8L3.5 16.5l3.3-.9A6.5 6.5 0 1 0 10 3.5Z',
  grid: 'M4.5 3.5h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM12.5 3.5h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM4.5 11.5h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM12.5 11.5h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z',
  users:
    'M10.3 7a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0ZM2.8 16c.8-2.6 2.5-3.8 4.7-3.8s3.9 1.2 4.7 3.8M13 4.5a2.6 2.6 0 0 1 0 5M14.5 12.4c1.4.4 2.3 1.6 2.8 3.6',
  teacher: 'M13 6.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 16.5c1.1-2.9 3.3-4.3 6-4.3s4.9 1.4 6 4.3',
  brief:
    'M4.5 6.5h11A1.5 1.5 0 0 1 17 8v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V8a1.5 1.5 0 0 1 1.5-1.5ZM7.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 12.5 5v1.5M3 10.5h14',
  calendar: 'M5 4.5h10A1.5 1.5 0 0 1 16.5 6v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5ZM3.5 8.5h13M7 3v3M13 3v3',
  logout: 'M12 4.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-3M7.5 13.5 4 10l3.5-3.5M4 10h7.5',
  bell: 'M10 3.5A4.5 4.5 0 0 0 5.5 8v3L4 13.5h12L14.5 11V8A4.5 4.5 0 0 0 10 3.5ZM8.3 16a1.8 1.8 0 0 0 3.4 0',
  clock: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 6.5V10l2.5 1.5',
  phone: 'M7.8 2.5h4.4A1.8 1.8 0 0 1 14 4.3v11.4a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 15.7V4.3a1.8 1.8 0 0 1 1.8-1.8ZM9 14.5h2',
  globe:
    'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM3.5 10h13M10 3.5c1.8 2 2.6 4.1 2.6 6.5S11.8 14.5 10 16.5c-1.8-2-2.6-4.1-2.6-6.5S8.2 5.5 10 3.5Z',
  trash: 'M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6',
  download: 'M10 4v9M6 9.5l4 4 4-4M4.5 16h11',
  reply: 'M8 5.5 3.5 10 8 14.5M3.5 10H11a5.5 5.5 0 0 1 5.5 5.5',
  forward: 'M12 5.5 16.5 10 12 14.5M16.5 10H9a5.5 5.5 0 0 0-5.5 5.5',
  approx: 'M4 8c2-2 4-2 6 0s4 2 6 0M4 13c2-2 4-2 6 0s4 2 6 0',
  box: 'M10 3 16.5 6.5v7L10 17l-6.5-3.5v-7L10 3ZM3.5 6.5 10 10l6.5-3.5M10 10v7',
  card: 'M4 5.5h12A1.5 1.5 0 0 1 17.5 7v6a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 13V7A1.5 1.5 0 0 1 4 5.5ZM2.5 8.5h15M5.5 11.5h3',
  wallet: 'M4.5 5.5h11A1.5 1.5 0 0 1 17 7v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5ZM17 9.5h-3a1.5 1.5 0 0 0 0 3h3',
  receipt: 'M5.5 3.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1v-13ZM8 7.5h4M8 10.5h4',
  star: 'm10 3.5 2 4.2 4.5.6-3.3 3.1.8 4.6L10 13.7 6 16l.8-4.6L3.5 8.3l4.5-.6L10 3.5Z',
  'arrow-up': 'M10 15.5v-11M5.5 9 10 4.5 14.5 9',
  'arrow-down': 'M10 4.5v11M5.5 11 10 15.5 14.5 11',
  'arrows-up-down': 'M7 15.5v-11M4 7.5l3-3 3 3M13 4.5v11M10 12.5l3 3 3-3',
  // The chat composer (phones): send (drawn for LTR), the client sheet, the template mode, attach.
  send: 'M3.5 10 16.5 4l-4 12.5-2.8-5.2L3.5 10ZM9.7 11.3 16.5 4',
  person: 'M13 6.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 16.5c1.1-2.9 3.3-4.3 6-4.3s4.9 1.4 6 4.3',
  template: 'M5.5 3.5h9v13h-9v-13ZM8 7.5h4M8 10.5h4M8 13.5h2',
  paperclip: 'm15.5 9.5-5.6 5.6a3.5 3.5 0 0 1-5-5l6.3-6.3a2.3 2.3 0 0 1 3.3 3.3l-6.3 6.3a1.2 1.2 0 0 1-1.7-1.7L12 6.2',
  /** «الردود السريعة»: a bolt (a saved reply in one tap). */
  bolt: 'M11 3 4.5 11.5H10l-1 5.5 6.5-8.5H10l1-5.5Z',
  // The password toggle: an open eye while the text is hidden, struck through once it shows.
  eye: 'M2.5 10S5.3 4.5 10 4.5s7.5 5.5 7.5 5.5-2.8 5.5-7.5 5.5S2.5 10 2.5 10ZM12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  'eye-off': 'M2.5 10S5.3 4.5 10 4.5s7.5 5.5 7.5 5.5-2.8 5.5-7.5 5.5S2.5 10 2.5 10ZM12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM4 4l12 12',
  sliders:
    'M3.5 6h8M14.5 6h2M13 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM3.5 14h2M8.5 14h8M7 12.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  // WhatsApp voice calls (docs/28): the handset, with the out / in arrow of a call entry, and the mic.
  call: 'M5.6 3.5h2l1.3 3.2-1.7 1.2a9 9 0 0 0 4.9 4.9l1.2-1.7 3.2 1.3v2a1.6 1.6 0 0 1-1.7 1.6A12.6 12.6 0 0 1 4 5.2a1.6 1.6 0 0 1 1.6-1.7Z',
  'call-out': 'M5.6 3.5h2l1.3 3.2-1.7 1.2a9 9 0 0 0 4.9 4.9l1.2-1.7 3.2 1.3v2a1.6 1.6 0 0 1-1.7 1.6A12.6 12.6 0 0 1 4 5.2a1.6 1.6 0 0 1 1.6-1.7ZM12.5 3.5h4v4M16.5 3.5 12 8',
  'call-in': 'M5.6 3.5h2l1.3 3.2-1.7 1.2a9 9 0 0 0 4.9 4.9l1.2-1.7 3.2 1.3v2a1.6 1.6 0 0 1-1.7 1.6A12.6 12.6 0 0 1 4 5.2a1.6 1.6 0 0 1 1.6-1.7ZM16.5 3.5 12 8M12 4.5V8h3.5',
  mic: 'M10 3a2.2 2.2 0 0 1 2.2 2.2v4.3a2.2 2.2 0 0 1-4.4 0V5.2A2.2 2.2 0 0 1 10 3ZM5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3',
  'mic-off': 'M10 3a2.2 2.2 0 0 1 2.2 2.2v4.3a2.2 2.2 0 0 1-4.4 0V5.2A2.2 2.2 0 0 1 10 3ZM5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3M4 4l12 12',
} as const;

export type IconName = keyof typeof PATHS;

/** Each directional icon follows the reading direction (docs/07 icons), no caller has to. */
const MIRROR: Partial<Record<IconName, string>> = {
  'chevron-left': 'ltr:-scale-x-100',
  'chevron-right': 'ltr:-scale-x-100',
  logout: 'ltr:-scale-x-100',
  reply: 'rtl:-scale-x-100',
  forward: 'rtl:-scale-x-100',
  send: 'rtl:-scale-x-100',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
}

/** Decorative line icon (aria-hidden). Name the control, not the icon. Default 18px. */
export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 2.2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[18px] shrink-0', MIRROR[name], className)}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
