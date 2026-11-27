export interface Props {
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
  /** The student's code, laid over the picture (docs/56: a capture names its student). */
  watermark?: string;
}
