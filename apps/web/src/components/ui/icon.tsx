import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

// Line icons from the reference sprite (docs/design/ink-and-gold.html): 20px grid, 1.6 stroke.
// Directional icons: «السابق» uses chevron-right, «التالي» chevron-left (picked per direction);
// `reply` is drawn for LTR, so pass className="rtl:-scale-x-100". Logout is drawn RTL-native.
const PATHS = {
  search: 'M14.5 9a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM13.2 13.2l3.6 3.6',
  plus: 'M10 4.5v11M4.5 10h11',
  minus: 'M4.5 10h11',
  more: 'M10 4.8h.01M10 10h.01M10 15.2h.01',
  'chevron-left': 'M12.5 5 7.5 10l5 5',
  'chevron-right': 'm7.5 5 5 5-5 5',
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
  clock: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 6.5V10l2.5 1.5',
  phone: 'M7.8 2.5h4.4A1.8 1.8 0 0 1 14 4.3v11.4a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 15.7V4.3a1.8 1.8 0 0 1 1.8-1.8ZM9 14.5h2',
  globe:
    'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM3.5 10h13M10 3.5c1.8 2 2.6 4.1 2.6 6.5S11.8 14.5 10 16.5c-1.8-2-2.6-4.1-2.6-6.5S8.2 5.5 10 3.5Z',
  trash: 'M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6',
  download: 'M10 4v9M6 9.5l4 4 4-4M4.5 16h11',
  reply: 'M8 5.5 3.5 10 8 14.5M3.5 10H11a5.5 5.5 0 0 1 5.5 5.5',
  approx: 'M4 8c2-2 4-2 6 0s4 2 6 0M4 13c2-2 4-2 6 0s4 2 6 0',
  box: 'M10 3 16.5 6.5v7L10 17l-6.5-3.5v-7L10 3ZM3.5 6.5 10 10l6.5-3.5M10 10v7',
  card: 'M4 5.5h12A1.5 1.5 0 0 1 17.5 7v6a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 13V7A1.5 1.5 0 0 1 4 5.5ZM2.5 8.5h15M5.5 11.5h3',
  wallet: 'M4.5 5.5h11A1.5 1.5 0 0 1 17 7v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5ZM17 9.5h-3a1.5 1.5 0 0 0 0 3h3',
  receipt: 'M5.5 3.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1v-13ZM8 7.5h4M8 10.5h4',
  sliders:
    'M3.5 6h8M14.5 6h2M13 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM3.5 14h2M8.5 14h8M7 12.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
} as const;

export type IconName = keyof typeof PATHS;

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
      className={cn('size-[18px] shrink-0', className)}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
