export interface CodeGateProps {
  publicId: string;
  /** The code was right: the page reads the report with its new cookie. */
  onVerified: () => void;
}
