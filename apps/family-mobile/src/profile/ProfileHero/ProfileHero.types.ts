export interface ProfileHeroProps {
  name: string;
  line: string;
  /** The signed photo URL, else null (the initials). */
  photo: string | null;
  /** A student's id, so their initials keep the tone of their home card; else the name. */
  seed: string | null;
}
