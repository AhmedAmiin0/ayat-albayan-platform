# App access (reviewer sign-in)

The whole app sits behind a sign-in, so Play Console → **App content → App access** must say
«All or some functionality is restricted» and give the reviewers a working way in. **Never put the
credentials in git**: type them only into Play Console.

## The way in to give reviewers: a student test login (code + password)

The WhatsApp code sign-in cannot work for a reviewer (the code goes to the registered WhatsApp
number), so give the **student code + password** sign-in, which needs no phone:

1. In the staff app, create a test student flagged as a test account (docs/56-test-accounts.md),
   e.g. name «طالب تجريبي», with a guardian that is also a test record. Use no real person's name or
   number.
2. Give the student a teacher, one or two upcoming lessons this week, one finished lesson with a sent
   report (PDF), and a package with one payment, so every tab shows content. A student login sees
   the package only when the student is their own contact
   (`apps/api/src/modules/people/portal/package/portal-package.mapper.ts`).
3. Create the student's own login (code + password) from the student's file.
4. In production settings, make sure **`family_login_enabled` is on** (default false:
   `packages/settings/src/domains/family-login.ts`); without it no family sign-in opens, the
   student password one included (`apps/api/src/modules/people/sign-in/flows/password.service.ts`).
5. In Play Console → App access → «Add instructions»:
   - Name: «Student test login»
   - Username: the student code (`AB-…`)
   - Password: the password from step 3
   - Instructions (English): «On the sign-in screen tap "Use the student code and password",
     enter the code and password. The app is for registered students of the academy; this test
     student has lessons, a report and a package. Privacy policy and account deletion are on the
     Account tab.»
6. Keep the login working for as long as the app is on Play (reviews repeat on every update).
   Never let a review see a real student's data.

## Optional: a guardian test login

Reviewers cannot receive a WhatsApp code, so only offer it if a test number the owner controls is
registered; otherwise the student login above is enough.
