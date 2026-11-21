# Google Play release checklist: family app 1.0.0 (com.ayatalbayan.family)

Straight to the **production** track, under the academy's organisation developer account; the draft
app «آيات البيان» (default language Arabic, free) already exists. «Owner» = the account owner (Play
Console, EAS, production settings); «CI» = `.github/workflows/mobile.yml`; «done» = in this PR.

## A. Before the build

| # | Step | Who |
|---|---|---|
| 1 | Merge this PR to develop (deploys family-web with `/privacy` and `/delete-account`) | Owner |
| 2 | Open `https://family.ayatalbayan.com/privacy` and `/delete-account` signed out; check the contact line shows the support address from `academy_contact` | Owner |
| 3 | Read both pages and confirm the commitments that are business decisions: «confirm within 7 days, delete within 30 days», payment records kept «as long as accounting and legal obligations require» (add a number of years if you want one) | Owner |
| 4 | Production settings: `family_login_enabled` **on**; leave `family_chat_enabled` / `family_meetings_in_app` as decided (the listing claims neither) | Owner |
| 5 | Family EAS project (`@holdmycup/ayat-albayan-family`), environment **production**: `EXPO_PUBLIC_API_URL=https://api.ayatalbayan.com`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_ORIGIN`, and the file variable `GOOGLE_SERVICES_JSON` (Firebase Android app `com.ayatalbayan.family`) (docs/50 §8) | Owner |
| 6 | Create the reviewer test student and its login (`app-access.md`) | Owner (staff app) |
| 7 | Build config: version 1.0.0, AAB, AD_ID and READ_MEDIA_IMAGES blocked, submit profile = production track, draft | done |

## B. Build the AAB

| # | Step | Who |
|---|---|---|
| 8 | `gh workflow run mobile.yml --ref develop -f action=build-android-apk -f app=family -f profile=production` (or Actions → mobile → Run workflow with those inputs) | Owner |
| 9 | The run builds eas.json `production` (app-bundle, EAS environment production) on Expo's servers, then tags it `aab-family-production-v1.0.0-b<run>` with the EAS build link in the release notes | CI |
| 10 | Signing: EAS keeps one Android keystore per application id, so the AAB is signed with the keystore the preview APK builds of `com.ayatalbayan.family` already use (expo.dev → project → Credentials). It becomes the Play **upload key**; never put it in git. If the build stops with «no keystore» (`--non-interactive` cannot create one), create it once in expo.dev → Credentials → Android → Add keystore | Owner / EAS |
| 11 | Download the `.aab` from the EAS build page | Owner |

## C. Play Console: set up the app (Dashboard → «Set up your app»)

| # | Step | Who | Source |
|---|---|---|---|
| 12 | App access: restricted, add the student test login | Owner | `app-access.md` |
| 13 | Ads: **No, my app does not contain ads** | Owner | — |
| 14 | Content rating: IARC questionnaire | Owner | `content-rating.md` |
| 15 | Target audience: all age groups including under 13; no ads; accept the Families policy | Owner | `target-audience.md` |
| 16 | News app: No | Owner | — |
| 17 | Data safety: every answer, deletion URL `https://family.ayatalbayan.com/delete-account` | Owner | `data-safety.md` |
| 18 | Government app: No. Financial features: None. Health: None | Owner | — |
| 19 | Privacy policy URL: `https://family.ayatalbayan.com/privacy` | Owner | — |
| 20 | Store settings: category **Education**; contact email = the academy's support address; website `https://ayatalbayan.com` | Owner | `listing.md` |
| 21 | Main store listing (Arabic default, then «Add translation» English): name, short and full description | Owner | `listing.md` |
| 22 | Graphics: icon `graphics/icon-512.png`, feature graphic `graphics/feature-graphic-1024x500.png`, 4-6 phone screenshots per language | Owner | `screenshots.md` |
| 23 | Countries: choose the countries the academy serves | Owner | — |

## D. Release to production

| # | Step | Who |
|---|---|---|
| 24 | Play App Signing: accept (Google holds the app signing key; the EAS keystore is the upload key) | Owner |
| 25 | Production → Create new release → upload the `.aab` (or later: `eas submit -p android --profile production` with the service-account key stored as an EAS secret; it creates a **draft** on the production track, eas.json `submit.production`) | Owner |
| 26 | Release name `1.0.0`, release notes = «What's new» (ar + en) from `listing.md` | Owner |
| 27 | Review the permission list Play shows against the PR body's list; answer any permission declaration | Owner |
| 28 | Send for review; new organisation accounts can take several days; reply to policy emails with the files above | Owner |

## E. After approval

| # | Step | Who |
|---|---|---|
| 29 | Check the live listing, install from Play, sign in with a real guardian number | Owner |
| 30 | Later updates: JavaScript-only changes can go as an EAS update to the `production` channel only once mobile.yml supports it (today it refuses OTAs for profile production); native changes need a new AAB with a higher version | Owner |
