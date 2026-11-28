import type { PeopleEditCalls } from './people-edit-api.types';

type Answer<K extends keyof PeopleEditCalls> = ReturnType<PeopleEditCalls[K]>;
type Body<K extends keyof PeopleEditCalls> = Parameters<PeopleEditCalls[K]>[1];

/** The people writes in the shape the web and phone forms hand to their mutations. */
export interface PeopleEditWrites {
  saveStudent: (input: { id: string; patch: Body<'editStudent'> }) => Answer<'editStudent'>;
  saveFamily: (input: { id: string; patch: Body<'editGuardian'> }) => Answer<'editGuardian'>;
  removeSecondPhone: (input: { guardianId: string; phone: string }) => Answer<'removePhone'>;
  moveFamily: (input: { studentId: string; body: Body<'move'> }) => Answer<'move'>;
  setContactSelf: (input: { studentId: string; value: boolean }) => Answer<'contactSelf'>;
  guardianToStudent: (guardianId: string) => Answer<'toStudent'>;
  studentToGuardian: (studentId: string) => Answer<'toGuardian'>;
}
