// One query key so web and mobile never drift.

export const PEOPLE_EDIT_KEY = ['people-edit'] as const;

/** GET /people/students/:id: the edit view of one student and their family. */
export const peopleEditKey = (studentId: string) => [...PEOPLE_EDIT_KEY, studentId] as const;

/** The guardian picker's results for one search. */
export const familySearchKey = (search: string) =>
  [...PEOPLE_EDIT_KEY, 'families', search] as const;
