export interface Props {
  /** forgot takes any identifier; firstTime takes a child's student code. */
  mode: 'forgot' | 'firstTime';
  /** `saved`: the password was saved (the caller says so and shows the sign-in form). */
  onDone: (saved: boolean) => void;
}
