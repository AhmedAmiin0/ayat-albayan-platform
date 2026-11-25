import type { Json, TablesInsert } from '@ab/db';
import type { PeopleEditView } from '@ab/shared';
import { normalizeArabic } from '@ab/core';
import type { GuardianRow, ViewRow } from './people-edit.repo';

type Family = NonNullable<ViewRow['guardian']>;

/** A row without its notes, unless they are shown (the admin's only). */
const notesIf = <R extends { notes: string | null }>(row: R, show: boolean) => {
  const { notes, ...rest } = row;
  return show ? { ...rest, notes } : rest;
};

/** GET /people/students/:id: the edit forms' data; the logins and the history as yes / no. */
export function toEditView(
  row: ViewRow,
  facts: { family: Family; hasRecords: boolean; notes: boolean },
): PeopleEditView {
  // `guardian` is replaced by the checked family; dropped by the rest spread.
  const { profile_id, guardian, own, ...student } = row;
  const { profile_id: familyLogin, ...family } = facts.family;
  const shown = {
    phone_e164: own?.phone_e164 ?? null,
    has_login: profile_id !== null,
    has_records: facts.hasRecords,
  };
  return {
    student: { ...notesIf(student, facts.notes), ...shown },
    guardian: { ...notesIf(family, facts.notes), has_login: familyLogin !== null },
  };
}

/** The audit snapshot of the fields a request named: { before, after } of those keys only. */
export function changedFields<R extends Record<string, Json | undefined>>(
  rows: { before: R; after: R },
  keys: readonly string[],
): { before: Json; after: Json } {
  const pick = (row: R): Json => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));
  return { before: pick(rows.before), after: pick(rows.after) };
}

/** No created_by, so students_brought_guard never credits the converting assistant. */
export function selfStudentInsert(guardian: GuardianRow) {
  const row: TablesInsert<'students'> = {
    guardian_id: guardian.id,
    name: guardian.name,
    name_normalized: normalizeArabic(guardian.name),
    tz: guardian.tz,
    contact_is_self: true,
  };
  return row;
}
