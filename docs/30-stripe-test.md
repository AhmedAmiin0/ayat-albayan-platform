# 30 — Stripe payment links (TEST BUILD ONLY)

Owner request, 2026-10-28: «add stripe integration. i need to be able to send link to the customer this payment link will make him subscribe and automaticly give the assistant his comission. also this works for the renewal. the assistant contacts the customer and generates the payment amount based on the conversation with the customer» + «make a test build only for stripe» + «dont make stripe available for the normal production build».

> Status: **test build only, sandbox keys only.** Nothing here is reachable in the normal web, mobile or API build. The go-live checklist at the end is explicitly **NOT done**.

## 1. The flow

1. In a family chat, the assistant opens «رابط دفع» (next to «اشتراك» and the bank transfer). She picks «اشتراك جديد» or «تجديد», fills the package as in «اشتراك جديد» (the renewal is prefilled like «جدّد الاشتراك»), sees the calculator price (`POST /sales/payment-links/quote`), types the amount agreed in the conversation, and creates the link (`POST /sales/payment-links`).
2. The API creates the package now, like the sales subscribe flow (catalog quote, the site's discount pills, the start-day rules, status `unpaid`), with one difference: **its price is the agreed amount**. Paying the link in full therefore makes the package paid, and the commission is computed on what the family paid. The agreed amount is free (> 0) unless the admin sets «أقصى خصم مسموح به» (`max_discount_pct`, default empty = no limit). Any student may get a link (the 2026-10-28 any-student decision). The creation is audited.
3. «إرسال في المحادثة» puts a text with the link `https://<web>/pay/<token>` in the composer; she sends it herself (inside the 24-hour window; outside it the app says an approved template is needed first). «نسخ» copies it. Nothing is ever sent automatically.
4. The family opens the platform page (`/pay/<token>`: first name, amount and lesson count only), taps «ادفع الآن» → `GET /pay/<token>/checkout` creates (or reuses while open) a Stripe Checkout Session and redirects (303). The link lasts 7 days; a session at most 23 hours and never past the link.
5. Stripe calls `POST /webhooks/stripe`. Only a **verified** event fulfils: the payment is recorded on the link's package through the normal `PaymentsService` (method `card`, Stripe's `amount_total`, `recorded_by` = the assistant who made the link). The usual recompute makes the package active (a trial student becomes «مشترك»), and the existing commission triggers (migrations 272 / 751) credit her: if nobody brought the student yet, the student is first attributed to her (`brought_at` = the link's creation) so the first-package commission applies; a renewal follows the renewal commission rules. The link becomes «مدفوع» and she gets a bell row (in-app only).
6. «روابط الدفع» lists her links (open / paid / expired / cancelled); an open link can be cancelled (its open session is expired and its unpaid package cancelled with the admin's rules).

### Webhook events (all five must be enabled on the endpoint)

| Event | What happens |
|---|---|
| `checkout.session.completed` | `payment_status` paid → the payment (above). `unpaid` (an async method pending) → the link shows «قيد المعالجة», nothing recorded. |
| `checkout.session.async_payment_succeeded` | The payment (above). |
| `checkout.session.async_payment_failed` | The link is open again with a fresh session on the next click. |
| `charge.refunded` | One **refund payment** per Stripe Refund (listed with the Refunds API), so the paid rule and the commission re-evaluate exactly as for an admin's «استرداد». |
| `charge.dispute.created` | A bell row for the admins only; nothing is changed automatically. |

### Money safety

- Idempotent twice: `stripe_events.event_id` (primary key) skips a processed event, and the payment's `client_request_id` is a uuid derived from the Checkout Session id (unique), a refund's from the Refund id. A replayed, duplicated or out-of-order event never records money twice.
- The signature is checked on the raw request bytes (`stripe-signature`, the webhook signing secret); a failure is 400 and nothing is stored. A live-mode event is refused.
- Two racing clicks on the payment page: one session wins (compare-and-set on the link), the other is expired at once.
- A payment Stripe took that the platform refuses (e.g. a cancelled package) is not retried: the admins get a bell row to settle it by hand.

## 2. The gate (the owner's hard rule)

| Layer | Off unless |
|---|---|
| API | env `FEATURE_STRIPE=test` (set nowhere by default; staging only, docs/09). Without it `StripeTestModule` is empty: no controller, the webhook route not mounted, every Stripe URL 404. With it, «الدفع الإلكتروني (اختبار)» (`/admin/stripe/settings`) and `GET /stripe/feature` exist, and **every other route is still 404** until the admin turns on `stripe_settings.stripe_enabled` (default false). |
| Web | build flag `VITE_FEATURE_STRIPE=1` **and** `GET /stripe/feature` → `{ stripe: true }`. With the flag off no request is made and nothing renders (`/pay/<token>` is a not-found page). |
| Mobile | the EAS profile `stripe-test` only: a separate app (`…stripetest` package, «Ayat – Stripe test», update channel `stripe-test`) built with `EXPO_PUBLIC_FEATURE_STRIPE=1`. The constant is inlined at bundle time, so in `preview` / `production` the Stripe UI is dead code; a unit test fails if those profiles ever set it. The app has no Stripe SDK: it only shares the platform link. |
| Keys | Vault (`stripe:api_key`, `stripe:webhook_secret`), entered in /admin/settings, write-only, masked on read, never in the repo, env files, logs, audit rows or responses. **Test keys only**: `rk_test_` / `sk_test_` (the API and the SQL function both refuse a live key). |

Data: migration `20261028000936_stripe_payment_links.sql` (`payment_links`, `stripe_events`, `stripe_settings`, the Vault functions, payment method `card`). RLS on all three tables (links: admins all, a salesperson reads / inserts her own; events: API only; settings: admins read).

## 3. Owner setup (staging, sandbox)

1. In Stripe, create a **sandbox** (never the live account).
2. In the sandbox: Developers → API keys → **Create restricted key** with only: *Checkout Sessions* **Write**, *Events* **Read**, *Charges* **Read**, *Refunds* **Read** (everything else None). Copy the `rk_test_…` key.
3. Add `FEATURE_STRIPE=test` to the staging API env and build the staging web with `VITE_FEATURE_STRIPE=1`, then redeploy (docs/09).
4. Open /admin/settings → «الدفع الإلكتروني (اختبار)»: copy «رابط الـWebhook». In the sandbox: Developers → Webhooks → **Add endpoint** with that URL and the five events above; copy its signing secret `whsec_…`.
5. Back in the section: paste the restricted key and the webhook secret, optionally a maximum discount, and turn on «تفعيل روابط الدفع».
6. Phone app: `eas build --profile stripe-test --platform android` (installs beside the normal app). The Android package differs (`…stripetest`): add that Android app to the Firebase project and use the updated `google-services.json` secret, or push notifications will not build/work in this variant. OTA updates for it go to the `stripe-test` channel only, bundled with `EXPO_PUBLIC_FEATURE_STRIPE=1`; never put that variable in the EAS «preview» environment.
7. Try it: create a link for a test student, open it, pay with Stripe's test card `4242 4242 4242 4242`; the package turns active and the commission row appears. Refund it in the Stripe Dashboard: a refund payment appears.

## 4. Go-live checklist — NOT DONE

None of this is done; do not enable Stripe in production until the owner decides each point.

- [ ] Owner decision to offer card payments in production at all, and a live Stripe account (KYC, bank account, SAR/USD settlement, fees) — this build refuses live keys by design.
- [ ] A production flag design replacing `FEATURE_STRIPE=test` (and removing the live-key refusal deliberately, with a review).
- [ ] Checkout locale / branding, payment methods chosen in the Dashboard, receipts e-mail.
- [ ] Legal: terms, refund policy, privacy notice for card payments.
- [ ] Reconciliation: Stripe payouts vs platform payments, fees as expenses, the dispute workflow.
- [ ] Expired links: a job closing them and cancelling their unpaid packages (today an expired link only reads as expired).
- [ ] e2e journey against the Stripe CLI / a mock, and monitoring of webhook failures.
- [ ] WhatsApp template for sending a link outside the 24-hour window.
