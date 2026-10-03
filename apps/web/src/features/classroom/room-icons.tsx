import { cn } from '@/lib/utils';

// Classroom line icons on the same 20px grid / 1.6 stroke as components/ui/icon.tsx.
const PATHS = {
  mic: 'M10 3a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 10 3ZM5 9.5a5 5 0 0 0 10 0M10 14.5V17',
  cam: 'M3.5 6h8.5A1.5 1.5 0 0 1 13.5 7.5v5A1.5 1.5 0 0 1 12 14H3.5A1.5 1.5 0 0 1 2 12.5v-5A1.5 1.5 0 0 1 3.5 6ZM13.5 9l4-2.5v7l-4-2.5',
  screen: 'M3.5 4h13A1.5 1.5 0 0 1 18 5.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13.5v-8A1.5 1.5 0 0 1 3.5 4ZM7 17.5h6M10 15v2.5',
  board: 'M3 4.5h14v9H3ZM6.5 16.5l2-3M13.5 16.5l-2-3M6 10.5l2.5-2.5 2 2 3-3',
  people:
    'M10.3 7a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0ZM2.8 16c.8-2.6 2.5-3.8 4.7-3.8s3.9 1.2 4.7 3.8M13 4.5a2.6 2.6 0 0 1 0 5M14.5 12.4c1.4.4 2.3 1.6 2.8 3.6',
  film: 'M4 3.5h12v13H4ZM7 3.5v13M13 3.5v13M4 7.5h3M4 12.5h3M13 7.5h3M13 12.5h3',
  pen: 'm12.5 4.5 3 3L8 15l-3.5.5L5 12l7.5-7.5Z',
  eraser: 'M8 16.5h8.5M3.8 12.2 11 5a1.4 1.4 0 0 1 2 0l2.5 2.5a1.4 1.4 0 0 1 0 2L9.5 15.5H7.1L3.8 12.2Z',
  undo: 'M7.5 5 4 8.5 7.5 12M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9',
  leave: 'M12 4.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-3M7.5 13.5 4 10l3.5-3.5M4 10h7.5',
  kick: 'M10.3 7a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0ZM2.8 16c.8-2.6 2.5-3.8 4.7-3.8s3.9 1.2 4.7 3.8M13.5 8.5l4 4M17.5 8.5l-4 4',
} as const;

export type RoomIconName = keyof typeof PATHS;

/** Decorative: the button around it carries the words. */
export function RoomIcon({ name, className }: { name: RoomIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
      className={cn('size-5 shrink-0', name === 'leave' && 'ltr:-scale-x-100', name === 'undo' && 'rtl:-scale-x-100', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
