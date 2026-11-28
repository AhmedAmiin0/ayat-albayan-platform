import type { Selection } from '@/features/finance/pricing/api';

export interface PdfDownloadProps {
  /** The calculator's choice: its country, students and discount make the list. */
  sel: Selection;
}
