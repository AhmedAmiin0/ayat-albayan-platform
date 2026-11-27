export type StaffKey = readonly unknown[];

export interface StudentKeys {
  all: StaffKey;
  one: (id: string) => StaffKey;
  statusCounts: (filters: unknown) => StaffKey;
  teacherOptions: () => StaffKey;
}

export interface InvoiceKeys {
  all: StaffKey;
  ofStudent: (studentId: string) => StaffKey;
}

export interface SalesCourseKeys {
  course: (studentId: string) => StaffKey;
  check: (body: string) => StaffKey;
  changeCheck: (path: string, body: string) => StaffKey;
}
