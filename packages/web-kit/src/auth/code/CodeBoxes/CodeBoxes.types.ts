export interface CodeBoxesProps {
  digits: string[];
  onDigits: (digits: string[]) => void;
  invalid?: boolean;
}
