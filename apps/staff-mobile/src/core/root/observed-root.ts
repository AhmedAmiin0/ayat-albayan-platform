import { Observe, ObserveRoot } from 'expo-observe';
import { StaffRootLayout } from './StaffRootLayout';

/**
 * Every dynamic segment (app/…/[id]) and every query param of the app's routes: route timings keep
 * the route name, and no student, lesson, report, chat, lead, payment or user id, phone number or
 * name leaves the phone in a param or url (a filtered param hides the whole url).
 * tests/route-params.test.ts fails when a segment of the route tree is missing here.
 */
const ROUTE_PARAMS = [
  ...['code', 'id', 'key', 'kind', 'lessonId', 'phone', 'publicId', 'reportId', 'studentId'],
  ...['audience', 'count', 'country', 'date', 'direct', 'discount', 'durationMin', 'from'],
  ...['leadId', 'minutes', 'missedAt', 'mode', 'msg', 'name', 'pkg', 'plan', 'program', 'r'],
  ...['renew', 'source', 'startsOn', 'status', 'student', 'studentName', 'subscriptionId'],
  ...['teacherId', 'teacherName', 'token', 'tz', 'view'],
];

// At module scope: the router integration must be on before the first screen mounts.
Observe.configure({ integrations: { 'expo-router': { filteredParams: ROUTE_PARAMS } } });

/** The root layout measured by EAS Observe (launch, time to render, time to interactive). */
export const ObservedRootLayout = ObserveRoot.wrap(StaffRootLayout);
