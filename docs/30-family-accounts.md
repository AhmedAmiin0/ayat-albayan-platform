# 30 — Family accounts: sign-in by WhatsApp code, usernames, forgot password

Owner request, 2026-10-27: «When the assistant registers a customer he creates an account for him:
students sign in with username and password, guardians with their phone number and a WhatsApp code
(OTP). If the user is the student, the default is phone number + WhatsApp code. Add forgot password
for all users: teacher, admin, assistant and student. Teachers sign in with username and password too.»

Owner answers (same day):

- Usernames are **generated**: a student's username is `students.code` (`AB-1234`); a teacher's is a short
  username the admin picks.
- A student's **first** password is set by the student through a WhatsApp code. No password is ever
  created by staff or shown to staff.
- Admins and assistants («المبيعات», «مساعد حلقة») **keep** email + password.
- Forgot password = a WhatsApp code to the phone **on file**.

Requirement ids: R-AUTH-01 (each role its own login), R-AUTH-02 (this document: family sign-in, usernames,
forgot password), R-NFR-02/03 (RLS, audit).

## 1. Who signs in how

| Who | Tab on /login | Identifier | Secret | Profile (role) |
|-----|---------------|------------|--------|----------------|
| The family's WhatsApp contact: a parent, or an adult student who is their own contact | «الأسرة والطلاب» | the guardian row's phone | a 6-digit WhatsApp code | `guardian`, linked by `guardians.profile_id` |
| A child student | «الأسرة والطلاب» → «اسم المستخدم» | `students.code` (case-insensitive: `ab-1234` works) | a password the student chose | `student`, linked by `students.profile_id` |
| A child's first sign-in («أول دخول؟») | «الأسرة والطلاب» | `students.code` | a code sent to the **guardian's** phone, then a new password | creates the `student` profile |
| Teacher | «فريق الأكاديمية» | the username the admin picked **or** their email | password | `teacher` (unchanged) |
| Admin, sales, classroom assistant | «فريق الأكاديمية» | email | password | unchanged |

`docs/03` line 17 stays true: the role `guardian` = a parent OR an adult student.

### The registration choice (a form DEVIATION)

Registration gets one new choice, «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (default «ولي الأمر»), stored
as `students.contact_is_self boolean not null default false`. It is in the sales and admin
registration / booking flows (web + mobile) and in the student profile edit. It is **not** in the
owner's Google Form: docs/13 marks it as a deviation (owner request 2026-10-27).

It only changes wording (the portal says «حسابي» instead of «أبنائي») and means that student needs no
separate username account. Both ways still work: a self-contact student can still use «أول دخول».

## 2. Accounts are created lazily

«The account is ready the moment the student is registered; it activates on first sign-in.»

No auth user is created at registration. An Admin-API call inside every registration path would add a
partial-failure mode to every booking, and staging already has ~190 real students. Instead:

- **First verified phone code** → the API creates the auth user and a `guardian` profile and links
  `guardians.profile_id`. A guardian who already has a profile (an admin made one on «المستخدمون») uses it.
- **Child «أول دخول»** (username + a code to the guardian's phone + a new password) → the API creates the
  auth user with that password and a `student` profile and links `students.profile_id`.
- No bulk creation, ever. Exactly one profile per guardian / student (the link is written with
  `where profile_id is null`; a lost race deletes the auth user it just made and uses the winner's).

**Synthetic auth emails.** GoTrue needs an email on every password / magic-link user. Family users get
`g-<guardian id>@family.invalid` and `s-<student id>@family.invalid`: RFC 2606 reserves `.invalid`, so no
mail can ever be delivered there. They are never displayed (the users list shows the username / phone),
never typed and never sent anywhere. If a GoTrue version ever rejects `.invalid`, the fallback is a
no-MX subdomain of the academy's own domain (open item 3).

**Phone conflicts.** `profiles.phone_e164` is UNIQUE. A phone already on a staff profile (a teacher who is
also a parent) cannot get a guardian profile: the verify answers `409 phone_belongs_to_staff` with a clear
message («هذا الرقم مسجَّل لأحد أعضاء فريق الأكاديمية؛ سجّل الدخول من تبويب فريق الأكاديمية»), never a crash. It
is only said after a correct code, so it reveals nothing to someone who does not hold the phone.

## 3. Codes

- 6 digits from `crypto.randomInt`, stored only as `HMAC-SHA256(pepper, purpose|subject|code)`. The pepper is
  the env secret `LOGIN_CODE_PEPPER` (≥ 32 chars, Vault / env, never committed; unset = every code route
  answers as unavailable). Compared with `timingSafeEqual`.
- TTL `login_code_ttl_minutes` (default 10), `login_code_max_attempts` per code (default 5), single use.
  Only the newest code of a subject counts; asking again retires the older one.
- Attempts are counted in SQL before the compare (`login_code_take`), and the code is spent with a
  compare-and-set (`login_code_spend`): parallel guesses cannot exceed the limit and a code cannot be replayed.
- **Rate limits** (no throttler existed: the public routes use the in-memory `WindowCounter` of the
  feedback form; the per-phone limits are counted in the database so they hold across instances):
  - per phone on file: 3 codes per 15 minutes, 10 per day, and 10 failed attempts per day across codes;
  - per identifier as typed (after normalising: trimmed, lower-cased, spaces / dashes / `+` folded, so
    `AB-1234`, `ab 1234` and `ab1234` share a bucket): 5 requests and 10 checks per 15 minutes;
  - per IP: 20 code requests, 30 checks and 30 username sign-ins per 15 minutes.
  - Brute force on sequential student codes: each guess needs a code the attacker does not see (it goes to
    the guardian's WhatsApp); 10 failed attempts per phone per day caps a student at 10 guesses of 10⁶ a day.
- Codes go **only to phones on file**: the guardian's phone (for the guardian and each of their child
  students), a teacher row's phone, a staff profile's `phone_e164`. Never to a number the caller typed that
  is not on file: a typed phone is only a lookup key.
- Every request / forgot response is the same `202` «إن كان الحساب موجودًا فقد أرسلنا رمزًا إلى رقم الواتساب
  المسجّل», whatever exists. The WhatsApp send runs after the response, so timing does not tell either.
  Sign-in failures are one generic message.
- Audit rows (`audit_log`, entity `auth`): `code_sign_in`, `password_set`, `password_reset`,
  `profile_provisioned`. Never a code, a hash or a password.

## 4. Sending: an authentication template, behind two gates

- The code is the WhatsApp **authentication**-category template `account_code` (Meta's fixed text with a
  copy-code button; no custom words) on the **notifications** line, sent through the existing
  `MessageDispatch` (per-line driver meta | kapso | crm; module mode routes it to a number like any template).
- It is sent directly, **not** queued in `messages`: a queued row would keep the code in
  `messages.template_params`, readable by staff in the chat. `login_codes` keeps only the hash and the send result.
- Catalog row: key `account_code`, `category authentication`, status **`not_submitted`**. It is **not**
  submitted to Meta or Kapso: the owner approves the submission separately (§8). The submit payload for an
  authentication template is Meta's OTP shape (BODY with the security line, FOOTER with the expiry, an OTP
  COPY_CODE button).
- **crm driver**: the CRM builds Meta's components from its own synced list and gets only body values and
  `buttonParams`. Whether it fills an OTP copy-code button is not documented, so authentication codes are
  **not supported on a crm line** until tested: keep the notifications line on meta or kapso for codes.
- Settings (registry, «القيم» → academy group): `family_login_enabled` (bool, default **false**),
  `login_code_ttl_minutes` (default 10, 3–30), `login_code_max_attempts` (default 5, 3–10).
- Codes are available only when `family_login_enabled` is on, `account_code` is approved, the pepper is
  set and the send gate is open. Otherwise:
  - the family tab and «أول دخول» show «الدخول للأسر غير متاح بعد»;
  - staff «نسيت كلمة المرور؟» shows «تواصل مع الإدارة لإعادة تعيين كلمة المرور» (the admin's existing
    «إعادة تعيين كلمة المرور» dialog on «المستخدمون»).
  - `GET /auth/code/status` → `{ available }` tells the pages which one to show.

## 5. Sessions without touching Supabase project settings

The phone provider stays off and no hosted Supabase setting changes.

- Phone code verified server-side → `auth.admin.generateLink({ type: 'magiclink', email })` on that user →
  the API returns **only** `{ token_hash, type }` (never the action link) → the client calls
  `supabase.auth.verifyOtp({ type, token_hash })` and holds a normal session.
- Username sign-in = `POST /auth/login { username, password }`: the API resolves the user's email, signs
  in on an **isolated** client (no stored session, the precedent of `SupabaseAccountAuth.passwordMatches`)
  and returns the session for `supabase.auth.setSession`. An identifier with `@` keeps signing in directly
  with GoTrue, as today.
- The landing is the role's home (`HOME_BY_ROLE`); a disabled account stays refused (`account_disabled`).

## 6. Endpoints (all public, zod-validated in `packages/shared`)

| Route | Body | Answer |
|-------|------|--------|
| `GET /auth/code/status` | — | `{ available }` |
| `POST /auth/code/request` | `{ phone }` | `202` always |
| `POST /auth/code/verify` | `{ phone, code }` | `{ token_hash, type }`; `401 invalid_code`, `409 phone_belongs_to_staff`, `403 account_disabled` |
| `POST /auth/login` | `{ username, password }` | `{ access_token, refresh_token, expires_in, expires_at }`; `401 invalid_credentials` |
| `POST /auth/password/forgot` | `{ identifier }` (email \| username \| student code \| phone) | `202` always |
| `POST /auth/password/reset` | `{ identifier, code, password }` | `204`; `401 invalid_code`, `400 password_*` |

All of them answer `429 too_many_requests` past a limit and `503 codes_unavailable` (request / forgot
still answer `202`) while §4's gates are closed. Password rules are the existing ones
(`AUTH_PASSWORD_MIN_LENGTH`, `passwordProblem`). A child's first password uses the reset route (purpose
`set_password`). A reset signs the user out everywhere else.

## 7. UI

- **Web /login**: two tabs. «فريق الأكاديمية» (default; email or username + password) and «الأسرة والطلاب»
  (phone → code, or «اسم المستخدم» + password, and «أول دخول؟» for a child). «نسيت كلمة المرور؟» on both. The
  code input is 6 boxes, paste-friendly, `autocomplete="one-time-code"`, with a resend timer.
- **Mobile** (OTA only, JS-only, no new dependency): the staff login accepts email or username;
  «نسيت كلمة المرور؟» (identifier → code → new password). Families keep the «use the website» notice.
- **Admin**: the teacher form gets «اسم المستخدم» (written to the teacher's login profile; it needs the login,
  which «المستخدمون» creates); the users list shows usernames.

## 8. Owner steps

1. Approve submitting `account_code` to Meta on the **notifications** line («القوالب» → submit). Meta
   reviews authentication templates within minutes; the health check then marks it approved.
2. Set `LOGIN_CODE_PEPPER` (a random 32+ character secret) in the API's env / Vault.
3. Turn on `family_login_enabled` («الإعدادات» → «القيم» → الأكاديمية).

## 9. Not in this PR

- The portal pages (`/portal*`, another routine): they read `guardians.profile_id`,
  `students.profile_id` and `students.contact_is_self`.
- The teacher–student channel (another routine).

## 10. Open items

1. A teacher's username can be picked once the teacher has a login; picking it while creating the login
   on «المستخدمون» is a follow-up.
2. The in-memory per-IP buckets are per API instance (as `WindowCounter` documents); the per-phone limits
   are in the database. Move the IP buckets to the database if the API ever runs on more instances.
3. `.invalid` synthetic emails: the e2e suite provisions a family login on the local GoTrue to prove it
   accepts them. If a later version validates MX records, switch the domain (one constant,
   `FAMILY_EMAIL_DOMAIN`); the logins already made keep working.
4. The crm driver and authentication templates (§4).
