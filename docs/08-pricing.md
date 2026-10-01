# 08 — Pricing & currency

Source of truth for prices: the academy's public staff calculator, **ayatalbayan.com/calculator** (model read from its bundle `/assets/index-P7HmNtLA.js` on 2026-10-02). The platform must quote exactly what the site quotes. Owner rule (2026-10-02): *any country whose currency is not one of the site's currencies is quoted in USD, converted with a currency API.*

## 1. Countries and currencies (from the site)

| Country | Code | Currency | Arabic symbol | Price rule |
|---|---|---|---|---|
| السعودية | SA | SAR | ر.س | base |
| الإمارات | AE | AED | د.إ | base (same numbers as SAR, by the site's choice — not an FX conversion) |
| قطر | QA | QAR | ر.ق | base |
| الكويت | KW | KWD | د.ك | `ceil(base / 10)` |
| عمان | OM | OMR | ر.ع | `ceil(base / 10)` |
| **any other / unknown** | — | **USD** | $ | `ceil(round2(base × rate(SAR→USD)))` — rate from the currency API (§4); rounded to cents first because API rates carry 6 decimals (120 × 0.266667 = 32.00004 → $32, not $33) |

`base` numbers are SAR. For a USD custom count the converted base is the fractional SAR amount (`rate × n`, §3), not the ceiled SAR price: 1 lesson of 30 min is `ceil(round2(11.25 × rate))` = $3, not $4 (decided 2026-10-02; the cheaper reading, and the site has no USD to copy).

## 2. Packages (base per lesson duration)

Durations: 30 / 45 / 60 minutes, default **45**.

| id | Arabic name (site) | Lessons | 30 | 45 | 60 | Flag |
|---|---|---|---|---|---|---|
| starter | الباقة الأساسية | 8 | 90 | 120 | 160 | |
| standard | الباقة المتقدمة | 12 | 135 | 180 | 235 | الأكثر شيوعاً (popular) |
| premium | الباقة الشاملة | 16 | 175 | 240 | 315 | |
| bulk | باقة الـ28 حلقة | 28 | 275 | 385 | 495 | خصم خاص (featured) |
| weekly | باقة الحلقة الأسبوعية | 4 (one 90-min lesson/week) | — | — | — | fixed **145**, duration fixed 90 |
| monthly | الاشتراك الشهري المكثّف | 20 (5 days/week) | 210 | 285 | 375 | |

Site "frequency" labels: weekly «مرة — ٩٠ دقيقة», starter «مرتين», standard «٣ مرات», premium «٤ مرات», monthly «٥ مرات», bulk «كل يوم».

## 3. Calculator rules (site)

- `price(tier, duration, country)` = rule from §1 applied to the tier base.
- **Custom lesson count** `n` (1–60, opens on 10): per-lesson rate = `bulk.base[d] / 28` if `n ≥ 28`, else `starter.base[d] / 8`; price = `ceil(rate × n / divisor)` (USD: convert as §1).
- **Students** (1–6, the site's stepper cap): total = price × students.
- **Discount**: pills 0 / 5 / 10 / 15 % plus the site's free number field (any 0–100, decimals allowed, `Number(text) || 0` clamped) on the total; after-discount = `round(total × (1 − d/100))`. Site hint: «أكثر من طالب؟ يمكنك عرض خصم الأسرة حسب شيت المبيعات.»
- **Per-lesson price** shown = price × (1 − d) / lessons, max 2 decimals, rounded the way the site's `Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })` shows it (half-up on the shortest decimal form: 9.825 → 9.83, 10.924999999999999 → 10.92), not `Math.round(x × 100) / 100`.
- **Savings badge** on the featured tier: `round((1 − price / starterRatePrice) × 100)` % where starterRatePrice = `ceil(starter.base[d]/8 × 28 / divisor)`.
- **WhatsApp offer text** (site format, one line each; the greeting and the package share line 1, joined by a space): «السلام عليكم، الباقة المقترحة لك: name (lessons - duration للحلقة)» · «عدد الطلاب: n» · «الإجمالي: X SYM» [+ «الخصم: d%» + «الإجمالي بعد الخصم: Y SYM»] · trial note «جميع الباقات تبدأ بجلسة تجريبية مجانية بالكامل — جرّب أولاً ثم قرّر.»
- Platform display follows docs/07: Western digits for every number (the site copy's Eastern digits are changed to Western, wording unchanged).

## 4. Currency API

- Provider: **ExchangeRate-API open access** — `https://open.er-api.com/v6/latest/SAR` (no key; daily updates; requires attribution «Rates By Exchange Rate API» linking to https://www.exchangerate-api.com; rate-limited, so the platform fetches at most once per update window).
- Configurable via env `FX_API_URL` (default above) so a keyed provider can replace it without code changes.
- Rates are cached in the `fx_rates` table (base, quote, rate, provider, fetched_at, provider_updated_at). A quote uses the newest stored rate if it is younger than 24 h; otherwise it refreshes; if the API is down it uses the newest stored rate (and says how old it is); if nothing was ever stored it falls back to the official **SAR/USD peg 3.75** and marks the quote as `fallback`.
- After a failed call (error, timeout 3 s, or a failed save) the API is not called again for 30 min; quotes use the fallbacks above meanwhile. A rate fetched but not saved is still used for that quote.
- Provider data is checked before it is stored: a SAR→USD rate more than 5 % from 1/3.75, or a publication time in the future, counts as a failed call.
- Every USD quote returns the rate, its date and the source, so a quote can be reproduced later; subscriptions/payments (Phase 3) snapshot the price **and** the rate used.

## 5. Owner decisions recorded / still open

- Prices = site (settled, owner 2026-10-02). Egypt-based guardians are quoted in USD (owner rule: not a site currency).
- Late-cancellation policy: still open (docs/05 §4 q2).
- Teacher payouts stay in EGP (R-TCH-01 rates); converting revenue to EGP for reports can reuse the same `fx_rates` table (Phase 3).
