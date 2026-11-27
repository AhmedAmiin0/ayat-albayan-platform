export interface TitleLineProps {
  title: string;
  meta?: string;
  metaStrong?: boolean;
  /** The title is the row's header: bolder than a plain row's name. */
  header: boolean;
  size: number;
  lineHeight: number;
}
