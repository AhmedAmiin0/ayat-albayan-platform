import type { BookingMode } from '@ab/client-core';
import type { QueryKey } from '@tanstack/react-query';

const all = ['booking'] as const;
const invoices = ['invoices'] as const;
const threads = ['threads'] as const;

export const COURSE_CHANGE_CHECK = 'course-change-check';

// A saved course change invalidates `all` except the mounted series check (third segment
// COURSE_CHANGE_CHECK): asked again it would answer no_change.
export const bookingKeys = {
  all,
  teachers: (mode: BookingMode, query: string): QueryKey => [...all, mode, 'teachers', query],
  check: (mode: BookingMode, body: string): QueryKey => [...all, mode, 'check', body],
  trialDateCheck: (mode: BookingMode, body: string): QueryKey => [
    ...all,
    mode,
    'trial-date-check',
    body,
  ],
  courseChange: (subscriptionId: string): QueryKey => [
    ...all,
    'admin',
    'course-change',
    subscriptionId,
  ],
  courseChangeCheck: (mode: BookingMode, base: string, body: string): QueryKey => [
    ...all,
    mode,
    COURSE_CHANGE_CHECK,
    base,
    body,
  ],
  makeupCandidates: (studentId: string): QueryKey => [...all, 'makeup-candidates', studentId],
};

export const isCourseChangeCheck = (key: QueryKey): boolean => key[2] === COURSE_CHANGE_CHECK;

export const invoiceKeys = {
  all: invoices,
  list: (query: string): QueryKey => [...invoices, query],
  download: (invoiceId: string): QueryKey => [...invoices, 'download', invoiceId],
};

// Under ['threads'], so a lead write that refreshes the chats also re-reads their media.
export const threadMediaKeys = {
  list: (phone: string): QueryKey => [...threads, phone, 'media'],
  url: (phone: string, messageId: string): QueryKey => [...threads, phone, 'media', messageId],
};
