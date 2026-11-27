import type { ReactNode } from 'react';

export interface SignInFrameProps {
  title: string;
  /** One line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** The app's own top (the family app's mark + wordmark + welcome); none: the staff mark and
   *  title. */
  header?: ReactNode;
}
