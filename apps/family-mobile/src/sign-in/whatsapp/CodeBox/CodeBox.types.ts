export type BoxLook = 'rest' | 'next' | 'refused';

export interface CodeBoxProps {
  digit: string;
  look: BoxLook;
}
