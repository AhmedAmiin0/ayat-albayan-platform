import type {
  GoogleStudentMapInput,
  GoogleStudentMapRow,
  GoogleTeacherMapInput,
  GoogleTeacherMapRow,
  TeacherCalendarOwnerInput,
  TeacherCalendarView,
} from '@ab/catalog';

interface ById {
  id: string;
}

export interface GoogleMapCalls {
  teachers: () => Promise<GoogleTeacherMapRow[]>;
  setTeacher: (params: ById, body: GoogleTeacherMapInput) => Promise<GoogleTeacherMapRow[]>;
  calendarOwner: (params: ById) => Promise<TeacherCalendarView>;
  setCalendarOwner: (
    params: ById,
    body: TeacherCalendarOwnerInput,
  ) => Promise<TeacherCalendarView>;
  students: (query: { q?: string }) => Promise<GoogleStudentMapRow[]>;
  setStudent: (params: ById, body: GoogleStudentMapInput) => Promise<GoogleStudentMapRow>;
  unsetStudent: (params: ById) => Promise<GoogleStudentMapRow>;
}
