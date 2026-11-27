export interface LinkItem {
  label: string;
  onClick: () => void;
}

export interface LinkRowProps {
  links: LinkItem[];
}
