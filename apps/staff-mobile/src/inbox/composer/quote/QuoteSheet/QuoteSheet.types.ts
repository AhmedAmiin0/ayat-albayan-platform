export interface QuoteSheetProps {
  /** The chat's number: it picks the country the sheet opens on and names where it is from. */
  phone: string;
  /** A text may go (the composer's rule): no → send and edit off, copy stays. */
  open: boolean;
  onClose: () => void;
}
