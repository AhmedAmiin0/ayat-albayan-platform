import type { splitLinks } from '@ab/shared';

export interface BubblePartProps {
  part: ReturnType<typeof splitLinks>[number];
}
