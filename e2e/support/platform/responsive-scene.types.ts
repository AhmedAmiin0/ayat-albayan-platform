/** What the responsive walk seeds once per width: a student, its join link, a new chat. */
export interface ResponsiveScene {
  studentId: string;
  /** The student's join-link path (/s/…), made through the admin's «create link» button. */
  studentLink: string;
  guardian: string;
}
