export interface CodeBoxesProps {
  value: string;
  onChange: (code: string) => void;
  /** The last try was refused: the boxes' edge says so. */
  refused: boolean;
}
