const enc = encodeURIComponent;

export const recordingsHref = (studentId: string) => `/recordings/${enc(studentId)}` as const;

/** The family's lesson page: its recording, report and files. */
export const lessonHref = (input: { studentId: string; lessonId: string }): string =>
  `/lesson/${enc(input.lessonId)}?${new URLSearchParams({ student: input.studentId }).toString()}`;
