export interface TitleLink {
  onPress: () => void;
  label: string;
}

export interface ListRowTitleProps {
  title: string;
  meta?: string;
  metaStrong?: boolean;
  /** The title becomes the row's header (lg, bold) and a link of its own, 44pt with its slop. */
  link?: TitleLink;
}
