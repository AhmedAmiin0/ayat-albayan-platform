// The permission catalog (dynamic roles). One stable `resource.action` key per group of API
// endpoints that had the same @Roles set before (the API's parity test). `grants` = the non-admin system roles holding
// it by default (seeded in 20261005000220 and later migrations); the system admin holds every grantable permission.
// Adding one: a row here, its i18n labels (permissions.items), a seed migration for its system roles, @Permissions('…').
import { PEOPLE_EDIT_ROWS } from './catalog.people-edit.js';
import { SHORT_LINK_ROWS } from './catalog.short-links.js';
/** Matrix sections, in display order. `self` is never shown: it follows the base role. */
export const PERMISSION_AREAS = ['people', 'students', 'teachers', 'schedule', 'classroom', 'reports',
  'messaging', 'finance', 'system', 'self'] as const;
export type PermissionArea = (typeof PERMISSION_AREAS)[number];
type Grant = 'teacher' | 'assistant' | 'sales' | 'guardian' | 'student';
const T: Grant[] = ['teacher'];
const TS: Grant[] = ['teacher', 'sales'];
const TA: Grant[] = ['teacher', 'assistant'];
const TAS: Grant[] = ['teacher', 'assistant', 'sales'];
export const PERMISSION_ROWS = [
  { key: 'leads.read', area: 'people', grants: [] },
  { key: 'leads.write', area: 'people', grants: [] },
  { key: 'leads.assign', area: 'people', grants: [] },
  { key: 'leads.link_family', area: 'people', grants: [] }, // Admin only.
  { key: 'applicants.read', area: 'people', grants: [] },
  { key: 'applicants.write', area: 'people', grants: [] },
  { key: 'students.read', area: 'students', grants: [] },
  { key: 'students.write', area: 'students', grants: [] },
  { key: 'students.balance', area: 'students', grants: T },
  // docs/16 row 23: returns name, code, status and teacher only; sales by default, switchable.
  { key: 'students.check_registration', area: 'students', grants: ['sales'] },
  { key: 'guardians.read', area: 'students', grants: [] },
  { key: 'guardians.write', area: 'students', grants: [] },
  ...PEOPLE_EDIT_ROWS,
  { key: 'assistants.read', area: 'students', grants: [] },
  { key: 'assistants.write', area: 'students', grants: [] },
  { key: 'teachers.read', area: 'teachers', grants: [] },
  { key: 'teachers.write', area: 'teachers', grants: [] },
  { key: 'availability.read', area: 'teachers', grants: T },
  { key: 'availability.write', area: 'teachers', grants: T },
  { key: 'dashboard.read', area: 'schedule', grants: [] },
  { key: 'lessons.read', area: 'schedule', grants: [] },
  { key: 'lessons.status', area: 'schedule', grants: T },
  { key: 'lessons.write', area: 'schedule', grants: [] },
  { key: 'booking.write', area: 'schedule', grants: [] },
  // docs/16 rows 37, 37b: one lesson at a time, never a series, an outcome or teacher pay.
  { key: 'lessons.reschedule', area: 'schedule', grants: ['sales'] },
  { key: 'lessons.cancel', area: 'schedule', grants: ['sales'] },
  { key: 'lessons.confirm', area: 'schedule', grants: ['sales'] },
  // Course pause routes for any student (docs/16 row 37c).
  { key: 'courses.pause', area: 'schedule', grants: ['sales'] },
  // The profile's course actions (migration 990): ANY student, audited.
  { key: 'subscriptions.stop', area: 'schedule', grants: ['sales'] },
  { key: 'subscriptions.refund', area: 'finance', grants: [] }, // Cancel with refund is admin only.
  { key: 'students.change_teacher', area: 'schedule', grants: ['sales'] },
  { key: 'courses.reschedule', area: 'schedule', grants: ['sales'] },
  // Price calculator routes: sales by default (migration 760).
  { key: 'pricing.read', area: 'schedule', grants: ['sales'] },
  { key: 'tasks.manage', area: 'schedule', grants: [] },
  { key: 'classroom.join', area: 'classroom', grants: TAS },
  { key: 'classroom.kick', area: 'classroom', grants: TAS },
  { key: 'classroom.moderate', area: 'classroom', grants: TA },
  { key: 'classroom.host', area: 'classroom', grants: T },
  { key: 'classroom.links', area: 'classroom', grants: [] },
  { key: 'recordings.read', area: 'classroom', grants: T },
  { key: 'recordings.manage', area: 'classroom', grants: T },
  { key: 'meetings.read', area: 'classroom', grants: TAS },
  { key: 'meetings.write', area: 'classroom', grants: TAS },
  { key: 'reports.read', area: 'reports', grants: T },
  { key: 'reports.write', area: 'reports', grants: T },
  { key: 'reports.resend', area: 'reports', grants: [] },
  { key: 'feedback.read', area: 'reports', grants: [] },
  { key: 'feedback.write', area: 'reports', grants: [] },
  { key: 'inbox.read', area: 'messaging', grants: TS },
  { key: 'inbox.send', area: 'messaging', grants: TS },
  { key: 'inbox.media', area: 'messaging', grants: [] },
  // Chat lists (docs/22): sales by default, switchable; teachers never get lists.
  { key: 'inbox.lists', area: 'messaging', grants: ['sales'] },
  // Shared saved replies; admin by default, grantable; personal replies need no permission.
  { key: 'saved_replies.manage', area: 'messaging', grants: [] },
  { key: 'messages.read', area: 'messaging', grants: TS },
  { key: 'messages.manage', area: 'messaging', grants: [] },
  { key: 'templates.manage', area: 'messaging', grants: [] },
  // Every template from the inbox; without it (or templates.manage) only the
  // restricted allow-list: free_trial_invite and welcome_greeting by default (restricted-templates.ts).
  { key: 'templates.send_all', area: 'messaging', grants: [] },
  { key: 'templates.author', area: 'messaging', grants: ['sales'] },
  ...SHORT_LINK_ROWS,
  // docs/31 §2: read every student channel (teacher ↔ family), read-only. The admin by default; the owning
  // assistant reads her own students' channels without it (sales ownership).
  { key: 'student_channels.monitor', area: 'messaging', grants: [] },
  { key: 'payments.read', area: 'finance', grants: [] },
  { key: 'payments.write', area: 'finance', grants: [] },
  { key: 'subscriptions.read', area: 'finance', grants: [] },
  { key: 'subscriptions.write', area: 'finance', grants: [] },
  // docs/16 row 24: the start date on the create and renew forms only.
  { key: 'subscriptions.set_start_date', area: 'finance', grants: ['sales'] },
  // Any change to an existing package or payment; admin only by default (migration 999).
  { key: 'subscriptions.edit_terms', area: 'finance', grants: [] },
  // Renew any student from the chat (docs/16 row 38): admin only by default.
  { key: 'sales.renew_any', area: 'finance', grants: [] },
  { key: 'invoices.read', area: 'finance', grants: [] },
  { key: 'receivables.read', area: 'finance', grants: [] },
  { key: 'payouts.read', area: 'finance', grants: [] },
  { key: 'payouts.write', area: 'finance', grants: [] },
  { key: 'payouts.approve', area: 'finance', grants: [] },
  // The assistant's (base role sales) pay: terms, commission ledger, monthly statements, attribution.
  { key: 'assistantpay.read', area: 'finance', grants: [] },
  { key: 'assistantpay.write', area: 'finance', grants: [] },
  { key: 'assistantpay.approve', area: 'finance', grants: [] },
  { key: 'earnings.read', area: 'finance', grants: [] },
  { key: 'earnings.write', area: 'finance', grants: [] },
  { key: 'expenses.read', area: 'finance', grants: [] },
  { key: 'expenses.write', area: 'finance', grants: [] },
  { key: 'exports.read', area: 'finance', grants: [] },
  { key: 'settings.read', area: 'system', grants: [] },
  { key: 'settings.write', area: 'system', grants: [] },
  // docs/23 §3 phase 3: admin only (migration 20261023000620); reading needs settings.read.
  { key: 'numbers.manage', area: 'system', grants: [] },
  // docs/23 §3 phase 4: granted to settings.write roles (migration 20261024000632).
  { key: 'notifications.manage', area: 'system', grants: [] },
  { key: 'activity.read', area: 'system', grants: [] },
  { key: 'roles.manage', area: 'system', grants: [] },
  // The bell (R-NOT-01): every staff portal reads its own notifications and registers its devices.
  { key: 'notifications.push', area: 'system', grants: TAS },
  { key: 'translations.manage', area: 'system', grants: [] },
  { key: 'users.read', area: 'system', grants: [] },
  { key: 'users.write', area: 'system', grants: [] },
  // Scope, not grants: a base role's "my …" pages; every role of that base role holds it.
  { key: 'self.teacher', area: 'self', grants: T },
  { key: 'self.sales', area: 'self', grants: ['sales'] },
  // The assistant's own pages (sales/me/*): the students they brought, the payments they recorded and
  // their earnings (terms, commissions, statements). Never grantable: they follow the base role.
  { key: 'self.sales_students', area: 'self', grants: ['sales'] },
  { key: 'self.sales_payments', area: 'self', grants: ['sales'] },
  { key: 'self.sales_earnings', area: 'self', grants: ['sales'] },
  // The assistant side of sales (docs/16): the academy's teachers, every student and
  // the lessons running now (read-only, whitelisted). Follows the base role like the keys above.
  { key: 'self.sales_academy', area: 'self', grants: ['sales'] },
  // Her money writes from the chat (docs/16 row 16): subscribe a student she owns and
  // record the family's bank transfer with its receipt (/sales/subscriptions, /sales/payments, /sales/money).
  { key: 'self.sales_money', area: 'self', grants: ['sales'] },
  { key: 'self.assistant', area: 'self', grants: ['assistant'] },
  // The family portal (/portal/*, docs/31): guardian or student login; a scope, not a grant (433).
  { key: 'self.portal', area: 'self', grants: ['guardian', 'student'] },
] as const satisfies readonly { key: string; area: PermissionArea; grants: readonly Grant[] }[];
