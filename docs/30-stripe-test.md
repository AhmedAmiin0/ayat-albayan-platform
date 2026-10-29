# 30 — Stripe payment links (TEST BUILD ONLY)

Owner request, 2026-10-28: «add stripe integration. i need to be able to send link to the customer this payment link will make him subscribe and automaticly give the assistant his comission. also this works for the renewal. the assistant contacts the customer and generates the payment amount based on the conversation with the customer» + «make a test build only for stripe» + «dont make stripe available for the normal production build» + «I want a new seperate build with stripe and all the features continue normally on the current build».

> Status: **test build only, sandbox keys only.** `FEATURE_STRIPE=test` is on for **staging** (deploy/staging/docker-compose.yml, docs/09); nothing here is reachable in the normal web or mobile build, and every route is 404 until the admin switch is on. The go-live checklist at the end is explicitly **NOT done**.

## 1. The flow

1. In a family chat, the assistant opens the one money entry, «اشتراك جديد» or «جدّد الاشتراك» (owner 2026-10-29: no separate «رابط دفع», no child names on the chat's buttons; the child is picked inside). She picks the child and fills the package (a renewal is prefilled from the child's last package), then «طريقة الدفع» → «دفع إلكتروني» (shown only in this build, for her own child; the normal build has the bank transfer only and no method picker). She sees the calculator price (`POST /sales/payment-links/quote`), types the amount agreed in the conversation, and creates the link (`POST /sales/payment-links`) with the form's own start day, «حلقات مستخدمة من الباقة» and «المعلم/ة». The API decides the kind: `renewal` once the student has a priced package, else `new`. The teacher is accepted for her own student only (403 `not_your_student` otherwise; the link alone is any student) and is assigned once the link exists, again on a retry of the same form. While a link is open, its package is not offered for «سجّل تحويلًا بنكيًا» (one package, never paid twice).
2. The API creates the package now, like the sales subscribe flow (catalog quote, the site's discount pills, the start-day rules, status `unpaid`), with one difference: **its price is the agreed amount**. Paying the link in full therefore makes the package paid, and the commission is computed on what the family paid. The agreed amount is free (> 0) unless the admin sets «أقصى خصم مسموح به» (`max_discount_pct`, default empty = no limit). Any student may get a link (the 2026-10-28 any-student decision). The creation is audited.
3. «إرسال في المحادثة» puts a text with the link `https://<API host>/pay/<token>` (env `API_PUBLIC_URL`) in the composer; she sends it herself (inside the 24-hour window; outside it the app says an approved template is needed first). «نسخ» copies it. Nothing is ever sent automatically.
4. The family opens the page the API serves itself (`GET /pay/<token>`: a small Arabic RTL HTML page, no script, a strict CSP, `no-store`; first name, package, amount only; expired / paid / cancelled / processing say so), taps «ادفع الآن» → `GET /pay/<token>/checkout` creates (or reuses while open) a Stripe Checkout Session and redirects (303). Stripe comes back to `/pay/<token>/done` («تم استلام الدفع، شكرًا») or `/pay/<token>/cancelled` («لم يتم الدفع»): text only, the webhook alone records the payment. The web PayPage (web builds with `VITE_FEATURE_STRIPE=1`) still reads `GET /pay/<token>` as JSON (`Accept: application/json`). The link lasts 7 days; a session at most 23 hours and never past the link.
   - **Back to the app** (owner 2026-10-29; OTA + API only, no in-app browser): a pay link the test app opens itself (a chat bubble, or «افتح الرابط» after «رابط دفع») gets `?from=<Platform.OS>` (`android` or `ios`: the app says its platform, the API never reads the User-Agent, which Chrome's «Request desktop site» strips of `Android`); `GET /pay/<token>?from=android|ios` sets an HttpOnly cookie `ab_pay_app=android|ios` on `/pay/<token>` (a day: a Checkout Session lasts at most 23 h) that Stripe's redirect carries back. With it, `/done` and `/cancelled` add «العودة إلى التطبيق»: for `android` an `intent:` URL naming the test package (`com.ayatalbayan.admin.stripetest`; both apps share the `ayatalbayan` scheme) whose fallback is the same page with `?auto=0`, elsewhere `ayatalbayan://pay-done?token=…&r=…`. `/done` also tries it at once (a meta refresh; Chrome may refuse without a tap, so the button is the reliable path). The app's `/pay-done` (admins and sales) reads the link from `GET /sales/payment-links` (hers only), polls 2 s for a minute while it is still open (then «لم يصل تأكيد الدفع بعد» and «تحديث»), shows «تم الدفع» / «لم يتم الدفع» and «فتح ملف الطالب» (her tree's student file, which reaches the chat), and never asks Stripe. In a build without Stripe `/pay-done` redirects to `/`. A link opened from WhatsApp gets no cookie: its pages are unchanged.
5. Stripe calls `POST /webhooks/stripe`. Only a **verified** event fulfils: the payment is recorded on the link's package through the normal `PaymentsService` (method `card`, Stripe's `amount_total`, `recorded_by` = the assistant who made the link). The usual recompute makes the package active (a trial student becomes «مشترك»), and the existing commission triggers (migrations 272 / 751) credit her: on a **new** subscription of a student nobody brought and who has no other priced package, the student is first attributed to her (`brought_at` = the link's creation) so the first-package commission applies; otherwise `brought_by` is never changed (no takeover; a renewal follows the renewal commission rules of whoever brought the student). Before a new link, the unpaid packages of the student's earlier expired / cancelled links are cancelled, so they are never owed and never turn the new package into a «renewal». The link becomes «مدفوع» and she gets a bell row (in-app only).
6. «روابط الدفع» lists her links (open / paid / expired / cancelled); an open link can be cancelled (its open session is expired and its unpaid package cancelled with the admin's rules).

### Webhook events (all six must be enabled on the endpoint)

| Event | What happens |
|---|---|
| `checkout.session.completed` | `payment_status` paid → the payment (above). `unpaid` (an async method pending) → the link shows «قيد المعالجة», nothing recorded. |
| `checkout.session.async_payment_succeeded` | The payment (above). |
| `checkout.session.async_payment_failed` | The link is open again with a fresh session on the next click. |
| `charge.refunded` | One **refund payment** per Stripe Refund (listed with the Refunds API), so the paid rule and the commission re-evaluate exactly as for an admin's «استرداد». |
| `refund.updated` | A refund still pending at `charge.refunded` is recorded once it succeeds. |
| `charge.dispute.created` | A bell row for the admins only; nothing is changed automatically. |

### Money safety

- Idempotent twice: `stripe_events.event_id` (primary key) skips a processed event, and the payment's `client_request_id` is a uuid derived from the Checkout Session id (unique), a refund's from the Refund id. A replayed, duplicated or out-of-order event never records money twice.
- The signature is checked on the raw request bytes (`stripe-signature`, the webhook signing secret); a failure is 400 and nothing is stored. A live-mode event is refused.
- Two racing clicks on the payment page: one session wins (compare-and-set on the link), the other is expired at once.
- A payment Stripe took that the platform refuses (e.g. a cancelled package), or whose link / package no longer exists, is not retried: the admins get a bell row to settle it by hand. A refund of a payment not recorded yet is retried for an hour, then alerted the same way.
- The webhook is **not** behind the DB switch (only behind `FEATURE_STRIPE`): a session opened before the admin turned Stripe off is still recorded, as are its refunds.

## 2. The gate (the owner's hard rule)

| Layer | Off unless |
|---|---|
| API | env `FEATURE_STRIPE=test` (set only in the staging compose, docs/09; remove the line and redeploy to switch it off). Without it `StripeTestModule` is empty: no controller, the webhook route not mounted, every Stripe URL 404. With it, «الدفع الإلكتروني (اختبار)» (`/admin/stripe/settings`) and `GET /stripe/feature` exist, and **every other route except the signed webhook is still 404** until the admin turns on `stripe_settings.stripe_enabled` (default false); a signed-out call to a sales route answers 401 first. |
| Web | build flag `VITE_FEATURE_STRIPE=1` **and** `GET /stripe/feature` → `{ stripe: true }`. With the flag off no request is made and nothing renders (`/pay/<token>` is a not-found page). |
| Mobile | the EAS profile `stripe-test` only: a separate app (`…stripetest` package, «Ayat – Stripe test», update channel `stripe-test`) built with `EXPO_PUBLIC_FEATURE_STRIPE=1`; it has every normal feature plus «دفع إلكتروني» inside «اشتراك جديد» / «جدّد الاشتراك», «روابط الدفع» under «المزيد», and the admin's «الإعدادات» → «الدفع الإلكتروني (اختبار)». No FCM push in it (no google-services.json; registration fails soft). The constant is inlined at bundle time, so in `preview` / `production` the Stripe UI is dead code; a unit test fails if those profiles ever set it. The app has no Stripe SDK: it only shares the platform link. |
| Keys | Vault (`stripe:api_key`, `stripe:webhook_secret`), entered in the test app's «الإعدادات» (or a web build's /admin/settings), write-only, masked on read, never in the repo, env files, logs, audit rows or responses. **Test keys only**: `rk_test_` / `sk_test_` (the API and the SQL function both refuse a live key). |

Data: migration `20261028000941_stripe_payment_links.sql` (`payment_links`, `stripe_events`, `stripe_settings`, the Vault functions, payment method `card`). RLS on all three tables (links: admins all, a salesperson reads her own and may insert only an unpayable draft of her own — no package, no Stripe ids — since every payable link is made by the API; events: API only; settings: admins read).

## 3. Owner setup (staging, sandbox)

1. In Stripe, create a **sandbox** (never the live account).
2. In the sandbox: Developers → API keys → **Create restricted key** with only: *Checkout Sessions* **Write**, *Events* **Read**, *Charges* **Read**, *Refunds* **Read** (everything else None). Copy the `rk_test_…` key.
3. Staging already has `FEATURE_STRIPE=test` (docs/09). Build the test app: GitHub → Actions → **mobile** → Run workflow on `develop`, `action` = `build-android-apk`, `profile` = `stripe-test`; install the APK (beside the normal app) and sign in as an admin.
4. In the test app: «المزيد» → «الإعدادات» → «الدفع الإلكتروني (اختبار)»: copy «رابط الـWebhook». In the sandbox: Developers → Webhooks → **Add endpoint** with that URL and the six events above; copy its signing secret `whsec_…`.
5. Back in the section: paste the restricted key and the webhook secret, optionally a maximum discount, and turn on «تفعيل روابط الدفع».
6. OTA updates for the test app: the same workflow with `action` = `ota-update`, `profile` = `stripe-test` (channel `stripe-test` only, bundled with `EXPO_PUBLIC_FEATURE_STRIPE=1`); never put that variable in the EAS «preview» environment. Push notifications: the test app is built without `google-services.json`, so it gets no FCM push (registration fails soft); to add push later, add the `…stripetest` Android app to Firebase and give the variant its file back.
7. Try it: create a link for a test student, open it, pay with Stripe's test card `4242 4242 4242 4242`; the package turns active and the commission row appears. Refund it in the Stripe Dashboard: a refund payment appears.

## 4. Go-live checklist — NOT DONE

None of this is done; do not enable Stripe in production until the owner decides each point.

- [ ] Owner decision to offer card payments in production at all, and a live Stripe account (KYC, bank account, SAR/USD settlement, fees) — this build refuses live keys by design.
- [ ] A production flag design replacing `FEATURE_STRIPE=test` (and removing the live-key refusal deliberately, with a review).
- [ ] Checkout locale / branding, payment methods chosen in the Dashboard, receipts e-mail.
- [ ] Legal: terms, refund policy, privacy notice for card payments.
- [ ] Reconciliation: Stripe payouts vs platform payments, fees as expenses, the dispute workflow.
- [ ] Expired links: a job closing them and cancelling their unpaid packages (today an expired link only reads as expired).
- [ ] A default discount cap: with `max_discount_pct` empty and a FIXED commission, a tiny agreed amount still earns the full fixed commission (set the cap on staging; staging must use its own database).
- [ ] e2e journey against the Stripe CLI / a mock, and monitoring of webhook failures.
- [ ] WhatsApp template for sending a link outside the 24-hour window.
