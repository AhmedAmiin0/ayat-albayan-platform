// The permission catalog (owner, 2026-10-05: "add dynamic roles and permissions"). One stable
// `resource.action` key per group of API endpoints that had the same @Roles set before roles became
// dynamic, so the five system roles keep exactly today's access (the API's parity test checks it).
// `grants` = the non-admin system roles that hold the permission by default (seeded in migration
// 20261005000220); the system admin always holds every grantable permission.
// Adding a permission: add a row here, its labels in i18n (permissions.items), a seed row in a new
// migration for the system roles that should get it, then use it in @Permissions('…').

/** Matrix sections, in display order. `self` is never shown: it follows the base role. */
export const PERMISSION_AREAS = [
  'people',
  'students',
  'teachers',
  'schedule',
  'classroom',
  'reports',
  'messaging',
  'finance',
  'system',
  'self',
] as const;
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
  { key: 'applicants.read', area: 'people', grants: [] },
  { key: 'applicants.write', area: 'people', grants: [] },
  { key: 'students.read', area: 'students', grants: [] },
  { key: 'students.write', area: 'students', grants: [] },
  { key: 'students.balance', area: 'students', grants: T },
  // «التحقق من التسجيل» (owner 2026-10-12, docs/16 row 23): is this phone / name already a student? Name,
  // code, status and teacher only. Sales by default; the admin may switch it off for the sales role.
  { key: 'students.check_registration', area: 'students', grants: ['sales'] },
  { key: 'guardians.read', area: 'students', grants: [] },
  { key: 'guardians.write', area: 'students', grants: [] },
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
  // «حاسبة الأسعار» GET /pricing/quote and /pricing/catalog. Sales by default (owner 2026-10-26: «عرض سعر» in the
  // chat, migration 20261026000760); teachers never.
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
  // «القوائم» (owner 2026-10-20, docs/22): create, rename and delete the academy's chat lists and add
  // chats to them. Sales by default (the admin may switch it off); teachers never get lists.
  { key: 'inbox.lists', area: 'messaging', grants: ['sales'] },
  // «الردود السريعة» (owner 2026-10-25): write the SHARED saved replies everyone with the inbox inserts.
  // The admin by default (grantable to assistants); personal replies «ردودي» need no permission.
  { key: 'saved_replies.manage', area: 'messaging', grants: [] },
  { key: 'messages.read', area: 'messaging', grants: TS },
  { key: 'messages.manage', area: 'messaging', grants: [] },
  { key: 'templates.manage', area: 'messaging', grants: [] },
  // Every template from the inbox (owner 2026-10-12); without it (or templates.manage) only the
  // restricted allow-list: free_trial_invite and welcome_greeting by default (restricted-templates.ts).
  { key: 'templates.send_all', area: 'messaging', grants: [] },
  // docs/31 §2: read every student channel (teacher ↔ family), read-only. The admin by default; the owning
  // assistant reads her own students' channels without it (sales ownership).
  { key: 'student_channels.monitor', area: 'messaging', grants: [] },
  { key: 'payments.read', area: 'finance', grants: [] },
  { key: 'payments.write', area: 'finance', grants: [] },
  { key: 'subscriptions.read', area: 'finance', grants: [] },
  { key: 'subscriptions.write', area: 'finance', grants: [] },
  // «تحديد تاريخ بداية الاشتراك» (owner 2026-10-12, docs/16 row 24): an inline check of the sales subscribe
  // (no route gate). Without it the package starts on the default day (today, Riyadh).
  { key: 'subscriptions.set_start_date', area: 'finance', grants: ['sales'] },
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
  // «الأرقام» (docs/23 §3 phase 3): add / edit WhatsApp numbers, their credentials, the import and the
  // comms_source switch. The admin only (migration 20261023000620); reading needs settings.read.
  { key: 'numbers.manage', area: 'system', grants: [] },
  // «الإشعارات» (docs/23 §3 phase 4): switch, time and route the notification rules. Granted by migration
  // 20261024000632 to every role holding settings.write; reading needs settings.read.
  { key: 'notifications.manage', area: 'system', grants: [] },
  { key: 'activity.read', area: 'system', grants: [] },
  { key: 'roles.manage', area: 'system', grants: [] },
  // The bell (R-NOT-01, 2026-10-12): every staff portal reads its own notifications and registers its devices.
  { key: 'notifications.push', area: 'system', grants: TAS },
  { key: 'translations.manage', area: 'system', grants: [] },
  { key: 'users.read', area: 'system', grants: [] },
  { key: 'users.write', area: 'system', grants: [] },
  // Scope, not grants: the "my …" pages of a base role (teachers/me/*, sales/*, assistants/me/*).
  // Every role with that base role holds it; nobody else does (the admin neither, as before).
  { key: 'self.teacher', area: 'self', grants: T },
  { key: 'self.sales', area: 'self', grants: ['sales'] },
  // The assistant's own pages (sales/me/*): the students they brought, the payments they recorded and
  // their earnings (terms, commissions, statements). Never grantable: they follow the base role.
  { key: 'self.sales_students', area: 'self', grants: ['sales'] },
  { key: 'self.sales_payments', area: 'self', grants: ['sales'] },
  { key: 'self.sales_earnings', area: 'self', grants: ['sales'] },
  // The assistant side of sales (owner 2026-10-11, docs/16): the academy's teachers, every student and
  // the lessons running now (read-only, whitelisted). Follows the base role like the keys above.
  { key: 'self.sales_academy', area: 'self', grants: ['sales'] },
  // Her money writes from the chat (owner 2026-10-12, docs/16 row 16): subscribe a student she owns and
  // record the family's bank transfer with its receipt (/sales/subscriptions, /sales/payments, /sales/money).
  { key: 'self.sales_money', area: 'self', grants: ['sales'] },
  { key: 'self.assistant', area: 'self', grants: ['assistant'] },
  // The family portal (/portal/*, docs/31): a guardian login (their students) or a student login (itself).
  // A scope, never a grant: the portal roles hold no matrix permission (migration 433).
  { key: 'self.portal', area: 'self', grants: ['guardian', 'student'] },
] as const satisfies readonly { key: string; area: PermissionArea; grants: readonly Grant[] }[];
