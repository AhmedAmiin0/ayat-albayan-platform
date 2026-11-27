import { cn } from '@ab/web-kit';

// The tile behind the chosen day slides to the next one (motion.css `.ab-indicator`).
export const INDICATOR = cn(
  'ab-indicator pointer-events-none absolute top-0 left-0 rounded-md bg-lapis-wash',
  'ring-2 ring-lapis',
);
