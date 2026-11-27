import type { ReportAccessView } from '@ab/shared';

export interface CodeChoicesProps {
  publicId: string;
  access: ReportAccessView;
  onVerified: () => void;
}

export type Notice = 'unavailable' | 'noPhone';
