import type { ReactNode } from 'react';

export interface Props {
  /** The person's name, or only the role word when the name is not known. */
  name: string;
  /** The small role label above the name; without it, no avatar either (no name to draw). */
  role?: string;
  /** The line under the name: the WhatsApp number or the student's code. */
  detail?: ReactNode;
}
