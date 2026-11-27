import { cn } from '@ab/web-kit';

// The current tab's tile is ONE element that slides to the chosen tab (motion.css
// `.ab-indicator`, --duration-move): it says where the page went.
export const INDICATOR = cn(
  'ab-indicator pointer-events-none absolute top-0 left-0 rounded-md bg-accent',
  'shell:bg-page shell:shadow-page before:absolute before:inset-y-2.5 before:start-0',
  'before:hidden before:w-1 before:rounded-full before:bg-lapis shell:before:block',
);
