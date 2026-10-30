import { joinNames, lessonWhenText, type OutboundTemplate } from '@ab/shared';
import type { PushTarget } from '@/common/push/push.service';
import { queuedRow, staffReachable, type QueuedMessage } from '@/modules/messaging/reminders';
import { noticeTemplate } from './notice-text';
import type { Notice, NoticeGuardian, NoticeStudent } from './notice.types';

// Who hears a schedule change, and how (owner 2026-10-30: «notify both teacher and student»).
// Pure: ScheduleNotices reads, this plans, the dedup keys make a retry or a double tap a no-op.

interface NoticePlan {
  /** WhatsApp rows (the notifications line), queued only while the rule is on and approved. */
  messages: QueuedMessage[];
  /** One bell / push per recipient, in their own zone; PushService applies the row's rule. */
  pushes: PushTarget[];
}

interface Family {
  guardian: NoticeGuardian;
  students: NoticeStudent[];
}
interface PushTo {
  profileId: string | null;
  tz: string;
  names: readonly string[];
  at: Date;
}
interface MessageTo {
  phone: string;
  /** The recipient part of the dedup key: «t:<teacher id>» or «g:<guardian id>». */
  to: string;
  guardianId: string | null;
  template: OutboundTemplate | null;
}

/** A change to a lesson already started (or a move from one) notifies nobody. */
export function isUpcoming(notice: Notice, now: Date): boolean {
  const past = (d: Date) => d.getTime() <= now.getTime();
  return !past(notice.at) && !(notice.from && past(notice.from));
}

/** messages.dedup_key: one per change and recipient («<key>:<subject>:t:<teacher id>»). */
export function noticeDedupKey(notice: Notice, to: string): string {
  return `${notice.key}:${notice.subject}:${to}`;
}

/** Each guardian with the students of theirs this change is about (siblings: one message). */
export function families(students: readonly NoticeStudent[]): Family[] {
  const byGuardian = new Map<string, Family>();
  for (const s of students) {
    if (!s.guardian) continue;
    const found = byGuardian.get(s.guardian.id);
    if (found) found.students.push(s);
    else byGuardian.set(s.guardian.id, { guardian: s.guardian, students: [s] });
  }
  return [...byGuardian.values()];
}

/** One profile's bell / push; none for the person who made the change or a profile-less one. */
function push(notice: Notice, to: PushTo): PushTarget | null {
  if (!to.profileId || to.profileId === notice.actorId) return null;
  const vars: Record<string, string> = {
    student: joinNames(to.names),
    when: lessonWhenText(to.at, to.tz),
  };
  if (notice.from) vars.from = lessonWhenText(notice.from, to.tz);
  const data: Record<string, string> = {};
  if (notice.lessonId) data.lessonId = notice.lessonId;
  const studentId = notice.students[0]?.id;
  if (studentId) data.studentId = studentId;
  return {
    kind: notice.key,
    subject: notice.subject,
    vars,
    data,
    profileIds: [to.profileId],
  };
}

/** A queued WhatsApp row, expiring when the lesson it names starts (late, it would confuse). */
function message(notice: Notice, to: MessageTo, now: Date): QueuedMessage | null {
  if (!to.template) return null;
  return queuedRow({
    phone: to.phone,
    guardianId: to.guardianId,
    lessonId: notice.lessonId,
    template: to.template,
    dedupKey: noticeDedupKey(notice, to.to),
    now,
    expiresAt: notice.at,
  });
}

const namesOf = (students: readonly NoticeStudent[]): string[] => students.map((s) => s.name);

function add(plan: NoticePlan, parts: { row?: QueuedMessage | null; bell?: PushTarget | null }) {
  if (parts.row) plan.messages.push(parts.row);
  if (parts.bell) plan.pushes.push(parts.bell);
}

/** Each teacher: WhatsApp while still on staff with a number, and their bell. */
function teacherParts(notice: Notice, now: Date, plan: NoticePlan): void {
  const names = namesOf(notice.students);
  for (const { teacher, at } of notice.teachers) {
    const { tz } = teacher;
    const template = noticeTemplate(notice, { name: teacher.display_name_ar, tz, names, at });
    const phone = staffReachable(teacher) ? teacher.phone_e164 : null;
    const to = { to: `t:${teacher.id}`, guardianId: null, template };
    const row = phone ? message(notice, { ...to, phone }, now) : null;
    add(plan, { row, bell: push(notice, { profileId: teacher.profile_id, tz, names, at }) });
  }
}

/** Each family: one WhatsApp to the guardian naming their students; their own bells. */
function familyParts(notice: Notice, now: Date, plan: NoticePlan): void {
  const at = notice.at;
  for (const { guardian, students } of families(notice.students)) {
    const names = namesOf(students);
    const template = noticeTemplate(notice, { name: guardian.name, tz: guardian.tz, names, at });
    const to = { phone: guardian.phone_e164, to: `g:${guardian.id}`, guardianId: guardian.id };
    add(plan, { row: message(notice, { ...to, template }, now) });
    // An adult student who is their own guardian shares the profile: one bell.
    const own = students.filter((s) => s.profile_id !== guardian.profile_id);
    for (const p of [guardian, ...own]) {
      add(plan, { bell: push(notice, { profileId: p.profile_id, tz: p.tz, names, at }) });
    }
  }
}

/** Everything one change sends: the teachers' and the families' WhatsApp rows and bells. */
export function planNotice(notice: Notice, now: Date): NoticePlan {
  const plan: NoticePlan = { messages: [], pushes: [] };
  if (!isUpcoming(notice, now)) return plan;
  teacherParts(notice, now, plan);
  familyParts(notice, now, plan);
  return plan;
}
