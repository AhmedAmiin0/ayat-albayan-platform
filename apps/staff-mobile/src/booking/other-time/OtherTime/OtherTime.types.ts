/** What GET /booking/outside-slots is asked: no from / to, the server counts from its own now. */
export interface OutsideParams {
  teacherId: string;
  durationMin: number;
  /** `?studentIds=a,b`: their lessons count as clashes. */
  studentIds?: string;
  excludeCourse?: string;
  excludeLessonId?: string;
}

export interface OtherTimeProps extends OutsideParams {
  /** The family's zone: the small clock beside each of the viewer's times. */
  tz: string;
  /** The chosen start (a server instant) and whether it lies outside the teacher hours. */
  onPick: (startsAt: string, outside: boolean) => void;
}
