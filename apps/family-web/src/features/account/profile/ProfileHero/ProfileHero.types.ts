export interface Props {
  name: string;
  line: string;
  /** The signed photo URL, else null (the initials). */
  photo: string | null;
  /** A student's id, so their initials keep the tone of their home; else the name. */
  seed: string | null;
}
