import { PUSH_KINDS, type PushKind } from '@ab/shared';
import { tabOpen, type TabRoute } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { threadHref } from '@/inbox/thread-cache';

// Where a tapped admin push opens (R-MOB-01). `data` is PushService's { kind, ...event.data }
// (docs/12 §6): untrusted JSON, so every field is checked before it reaches a route.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function pushKind(data: unknown): PushKind | null {
  const kind = isRecord(data) ? data['kind'] : undefined;
  return PUSH_KINDS.find((k) => k === kind) ?? null;
}

function field(data: unknown, key: string): string | null {
  const value = isRecord(data) ? data[key] : undefined;
  return typeof value === 'string' && value ? value : null;
}

/** The phone a message push is about, if it carries a usable one. */
export function pushPhone(data: unknown): string | null {
  const phone = field(data, 'phone');
  return phone && /^\+\d{6,15}$/.test(phone) ? phone : null;
}

const toThread = (data: unknown) => {
  const phone = pushPhone(data);
  return phone ? threadHref(phone) : '/inbox';
};

const toStudent = (data: unknown) => {
  const student = field(data, 'studentId');
  return student && /^[\w-]+$/.test(student) ? `/students/${student}` : '/students';
};

/**
 * new lead / new message / failed reminder → that number's thread; lesson needs confirmation →
 * Today; report submitted / payment due → the student (the balance card is on that screen).
 * Without the id it needs, the matching list. Typed by PushKind, so a new kind must pick a screen.
 */
const ROUTES: Record<PushKind, (data: unknown) => string> = {
  new_lead: toThread,
  new_message: toThread,
  reminder_failed: toThread,
  lesson_needs_confirmation: () => '/',
  report_submitted: toStudent,
  payment_due: toStudent,
};

const tabOf = (href: string): TabRoute => (href.startsWith('/inbox') ? 'inbox' : href.startsWith('/students') ? 'students' : 'today');

/**
 * The screen a tapped push opens; null for anything that is not an admin push (stay put). A push
 * into a tab the role cannot see (it is hidden, a push there goes nowhere) opens «المزيد» instead.
 */
export function routeFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  if (!kind) return null;
  const href = ROUTES[kind](data);
  return tabOpen(can, tabOf(href)) ? href : '/more';
}
