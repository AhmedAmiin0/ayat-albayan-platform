export interface ProfileCardProps {
  name: string;
  line: string;
  /** The signed photo URL, else null (the initials), as on the profile page. */
  photo: string | null;
  /** A student's id (their home card's tone), else null (the name). */
  seed: string | null;
}
