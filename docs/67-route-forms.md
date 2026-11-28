# 67 · Route forms: one schema checks the form, the request and the server

The owner asked on 2026-11-28 for:
- a form that validates the schema of the route it submits to;
- a reusable form component for both platforms;
- the same validation layer in the backend.

The route object (`defineRoute`, docs/62 part 3) is the single source. Its `body` schema checks the form before sending, the API's `@RouteInput()` checks the request with the same schema, and both sides report an issue in one shape that the clients turn into the same Arabic or English text.

## Owner decisions (defaults taken; he can still change them)

- `@tanstack/react-form` becomes a dependency of mobile-kit, so both platforms share one engine. The web already uses it, and the owner asked for both platforms.
- The 3 new i18n keys are written in clear Modern Standard Arabic and in English by the builder.
- `changesOnly` stays as the pilots behave today: with no change, the save button is off.

## PR 0 · API: one issue shape (before PR 1)

Title `feat(api): send zod issue codes with validation errors and mark partial bodies on routes`, branch `feat/route-form-api`.

- **Issue shape.** `parseOrThrow` (apps/api/src/common/http/http.ts) keeps `message: 'validation_failed'` and `{ path, message }` per issue. Each issue also gains `code` (zod's issue code) and the zod limit fields that code carries: minimum, maximum, inclusive, origin, format, expected, values and keys. This only adds fields, so existing clients still work.
- **Shared schema.** The issue schema lives once in `@ab/core` beside the api error schema (`packages/core/src/schemas/error`). The API builds its 400 body through it, and the clients parse with it.
- **Partial bodies.** `defineRoute` takes an optional `partial: true` for PATCH bodies. When it is set, `@RouteInput()` keeps only the keys the client sent, which is what `@ZodBody(…, { sentOnly: true })` does today. This lets the contracts lanes move those handlers without losing the behaviour.
- **Tests first:**
  - one test proves that the same input gives the same issue list from the client-side check (`route.body.safeParse`) and from the API's 400 body;
  - a partial route keeps unsent keys out;
  - an old client that reads only `{ path, message }` still works.
- **The remaining old-style handlers** (`@ZodBody`, raw `@Body()`) belong to the contracts lanes. When they reach zero, a guard stops new ones; this lane does not edit them.

The client mapper in PR 1 then reads the server's `code` and its limits like a client-side zod issue, so a field error has the same text whichever side caught it.

## The build brief (PRs 1–3)

The brief below was checked against develop on 2026-11-28 by three independent designs, a judge and a skeptic. Its «open owner questions» are answered above.

GOAL: A form validates against the zod body schema of the route it submits to, on web and mobile, as one reusable component. Read origin/develop (b36f5ff6a or later). Rules 1-4, 10-17, 21, 23 and 25 apply.
- Rule 1: at most 150 lines per file and 100 characters per line; functions at most 50 lines.
- Rule 2: at most 3 params per function.
- Rule 3: strict TypeScript, no casts and no suppressions.
- Rule 4: tests sit next to the code, in tests/ when there are 2 or more.
- Rule 14: TDD, red test first. Never run tests, installs or builds on the owner's PC; use CI or a cloud session.

== VERIFIED FACTS (origin/develop) ==
- **TanStack Form.** @tanstack/react-form and form-core are 1.33.5 in pnpm-lock. createFormHook and createFormHookContexts exist.
- **Who has it.** web-kit and staff-web already depend on @tanstack/react-form. mobile-kit does not.
- **Zod** is 4.6.5.
- **Route types.** RouteBody<R> = z.input of R.body (@ab/core routes/route.types.ts). CallableRoute is in client-core core/http/call/call.types.ts, exported from client-core core/http.
- **Account route.** accountRoutes.updateProfile is in @ab/shared (people/account/account.routes.ts): PATCH /me/profile, body profileUpdateSchema.
  - full_name: optional, trimmed, min 2 'name_too_short', max 80 'name_too_long'.
  - phone_e164: z.preprocess (its input type is unknown).
  - superRefine adds a root issue 'empty_update' (path []).
- **Error helpers.** apiErrorSchema (@ab/core schemas/error) is `{code, message?, issues?: {path,message}[]}` (loose). ApiError, apiErrorCode and isNoAnswer are in client-core core/http.
  - isNoAnswer is true for any non-ApiError, or status >= 500.
  - apiErrorCode reads `{code}` only.
- **API error bodies.**
  - Every API error has a code (withCode). A 400 is `{message:'validation_failed', code:'validation_failed', issues:[{path:'a.b', message}]}`. A 5xx has a code too (e.g. 'service_unavailable').
  - bad_response is `ApiError(200, {code:'bad_response', path, issues: string[]})`.
- **TanStack 1.33.5 behaviour (form-core dist/esm).**
  - Field errors are flattened: meta.errors = issue[] (FormApi.js:955-975).
  - A field edit clears that field's onSubmit error (FieldApi.js:303-318), and through form.validateSync('change') it also clears the form-level onSubmit error (FormApi.js:310-322).
  - Any key in a validator's `fields` becomes fieldMeta even with no mounted field. validateAllFields skips it, and handleSubmit then returns on !isFieldsValid (FormApi.js:523-524), which locks the form.
  - `form: {}` counts as a form error.
  - The canSubmit gate only returns while submissionAttempts <= 1, so a second handleSubmit during a pending one runs again.
- **i18n.** common.required, error, save, invalidTime, invalidTimeZone, endBeforeStart and phoneErrors.{empty,not_a_number,invalid_length,missing_country_code} exist, as do account.save, saving, name.{title,label,hint}, toast.name and errors.{name_too_short,name_too_long,…}. common.invalidValue, noAnswer and savedUnread do not exist.
- **Folder caps.** web-kit components/ui/form has 12 sub-folders (at the cap), so new web components go in components/form/. mobile-kit ui/form has 10 sub-folders and no code files.
- **No Stryker config** exists in the repo.

== DESIGN ==
- **One validator.** client-core builds a plain options object with a single `validators.onSubmitAsync` and no Standard Schema sync validator. It imports zod, @ab/core and its own core/http; no React, no TanStack. The validator:
  1. Runs `route.body.safeParse(value)`.
  2. If parsing fails, returns toFormErrors(issues, isPlaced).
  3. Otherwise awaits send(parsed.data), resolves undefined on success, or returns failureErrors(e, isPlaced).
- **Where errors go.**
  - An issue goes to `fields[name]` only when that field is mounted. isPlaced comes from the validator's formApi argument: `formApi.fieldInfo[name]?.instance` is truthy.
  - Every other issue (root '', or an unknown or unrendered path) goes to `form[name]` only.
  - `form` is undefined when empty.
  - This removes the lock above, and the kits render every form-level issue without their own fieldInfo check.
- **What is sent.** It sends the parsed z.output, so the payload stays trimmed like today and the existing pilot assertions hold. A route whose output is not valid input fails typecheck at the call site, which is intended.
- **Text.** client-core returns keys and the kits turn them into text at call time (`t` gets DB overrides at boot). No z.config.

== FILES ==

**packages/client-core/src/core/form/** (new; core/ then has 7 sub-folders)
- **form.schemas.ts**
  - `FORM_ERROR_KEYS = ['required','invalidValue','invalidTime','invalidTimeZone','endBeforeStart','phoneNotANumber','phoneInvalidLength','phoneMissingCountryCode','noAnswer','savedUnread','error'] as const`, with `formErrorKeySchema = z.enum(FORM_ERROR_KEYS)` and `FormErrorKey = z.infer`. No phoneEmpty: 'empty' maps to phoneInvalidLength, like client-core people/users/validation.ts:27.
  - `formIssueSchema = z.looseObject({ message: z.string(), code: z.string().optional(), origin: z.string().optional(), minimum: z.unknown().optional() })`, with `FormIssue = z.infer`.
- **form.types.ts** (types only):
  - `BodyRoute = CallableRoute & { body: z.ZodType }`
  - `RouteFormOptions<R extends BodyRoute> { route: R; defaultValues: RouteBody<R>; send: (body: z.output<R['body']>) => Promise<unknown> }`
  - `FormErrors { form?: Record<string, FormIssue[]>; fields: Record<string, FormIssue[]> }`
  - `IsPlaced = (name: string) => boolean`
  - `FormApiLike { fieldInfo: Partial<Record<string, { instance: unknown }>> }`, a structural view of TanStack's formApi.
- **field-name.ts**: `fieldName(path: string): string`, turning `.N` into `[N]` (known edge: numeric record keys).
- **to-form-errors.ts**: `toFormErrors(issues: readonly FormIssueWithPath[], isPlaced): FormErrors | undefined`.
  - Path '' and unplaced names go to form; placed names go to fields.
  - Returns undefined when there are no issues; form is omitted when empty.
- **failure-errors.ts**: `failureErrors(e: unknown, isPlaced): FormErrors`. A Record<kind, handler> table chosen by named predicates, in this ORDER:
  1. **issues**: an ApiError whose body parses with apiErrorSchema and has issues. Each `{path,message}` gets `code:'custom'` and goes through toFormErrors. Checked first, because the 400 also has code 'validation_failed'.
  2. **noAnswer**: isNoAnswer(e) (any non-ApiError, or status >= 500). The result is `form[''] = [{message:'no_answer'}]`. Must come before code, because a 5xx has a code.
  3. **code**: apiErrorCode(e) !== null (409, 403, 404, bad_response…). The result is `form[''] = [{message: code}]`, with no zod code.
  4. **else**: `form[''] = [{message:'error'}]`.
- **route-form.ts**:
  ```ts
  export function routeForm<R extends BodyRoute>({ route, defaultValues, send }: RouteFormOptions<R>) {
    return { defaultValues, validators: { onSubmitAsync: (a: { value: RouteBody<R>; formApi: FormApiLike }) => check(route, send, a) } };
  }
  ```
  - `check` is in the same file or in submit-check.ts, at most 3 params.
  - It does the safeParse, then toFormErrors, then send, then failureErrors.
  - isPlaced is `(n) => Boolean(a.formApi.fieldInfo[n]?.instance)`.
- **issue-key.ts**: `issueKey(issue: unknown): FormErrorKey`.
  - formIssueSchema fails to parse: 'error'.
  - Else MESSAGE_KEYS[message] (a z.record(z.string(), formErrorKeySchema).readonly().decode table):
    - invalid_time, invalid_time_zone, end_before_start
    - empty -> phoneInvalidLength; not_a_number, invalid_length, missing_country_code
    - bad_response -> savedUnread; no_answer -> noAnswer; error -> error
  - Else, with a zod code:
    - invalid_type -> required.
    - too_small on a string with minimum <= 1 -> required (a named predicate).
    - Any other code -> invalidValue (ZOD_CODE_KEYS, a z.record decode table).
  - No code -> 'error'.
- **index.ts** exports routeForm, issueKey, formIssueSchema, formErrorKeySchema and the types. Add `export * from './core/form'` to packages/client-core/src/index.ts.

**packages/shared/i18n/ar.json + en.json** (parity), new keys under common:
- invalidValue: ar «القيمة غير صحيحة، راجعها», en «This value is not valid. Check it.»
- noAnswer: ar «لم يصل ردّ الخادم، وربما حُفظت البيانات. حدّث الصفحة قبل الإرسال مرة أخرى», en «The server did not answer; your change may have been saved. Refresh the page before sending again.»
- savedUnread: ar «تم الحفظ، حدّث الصفحة لرؤية التغيير», en «Saved. Refresh the page to see the change.»

**packages/web-kit** (already has @tanstack/react-form ^1.33.5)
- **src/lib/form/form-context.ts**: `export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();`. It is a separate file to avoid an import cycle.
- **src/lib/form/app-form.ts**: `export const { useAppForm } = createFormHook({ fieldContext, formContext, fieldComponents: { TextField }, formComponents: { FormFrame } });`
- **src/lib/form/error-text.ts**: `formErrorText(errors: readonly unknown[], messages?: Readonly<Record<string,string>>): string | undefined`.
  - Take the first of `errors.flat()` and parse it with formIssueSchema.
  - Return `messages?.[message]`, else `KEY_TEXT[issueKey(issue)]()`.
  - KEY_TEXT is a `z.record(formErrorKeySchema, z.function({ input: [], output: z.string() })).readonly().decode({...})` of thunks reading t.common.*. If z.function cannot sit in decode, see «unproven».
- **src/components/form/TextField/**: TextField.tsx, TextField.types.ts, use-text-field.ts, index.ts, TextField.showcase.tsx, tests/.
  - The kit Field plus Input: value = field.state.value, onChange = handleChange, onBlur = handleBlur, error = formErrorText(field.state.meta.errors, messages).
  - Props: label, hint?, required?, messages?, plus Input passthrough (dir, autoComplete, maxLength, inputMode, type).
- **src/components/form/FormFrame/**: same 6 entries.
  - `<form noValidate className="grid gap-4">`. The submit handler lives in the hook: preventDefault, an isSubmitting guard (one early return), then form.handleSubmit().
  - Then the children.
  - Then a FormAlert for each form-level issue, read from useStore(form.store, s => s.errorMap.onSubmit)'s `form` record and passed through formErrorText(..., messages).
  - Then the kit Button type=submit with className justify-self-start. It is disabled and aria-busy while isSubmitting, or when changesOnly && isDefaultValue. Its label is busyLabel while submitting, else submitLabel.
  - Props: submitLabel, busyLabel?, messages?, changesOnly?, variant?, children.
- **src/index.ts** exports useAppForm only (knip). Component indexes export only the component, never a hook (rule 16). Errors are derived in render, with no useMemo, useCallback or useEffect (rule 21).

**packages/mobile-kit**
- **package.json**: add the dependency "@tanstack/react-form": "^1.33.5".
  - The lockfile importer changes, so pnpm i runs in CI or a cloud session.
  - No @ab edge is added.
  - @tanstack/react-store declares a react-dom peer but never imports it; the workspace overrides react-dom to 19.2.3.
- **src/ui/form/form-context.ts, app-form.ts, error-text.ts**: as on web, reading the mobile t (lib/i18n/i18n).
- **src/ui/form/TextField/** (same 6 entries):
  - Composes ui/form/Field + hint + ErrorLine through a HintedField sub-folder, `ui/form/TextField/HintedField/`. That holds AccountField's markup with its gap taken from `space`, not a raw 4.
  - `account/AccountField` then renders HintedField, so ui does not import account and nothing is duplicated.
  - Wiring: value, onChangeText = handleChange, onBlur = handleBlur, error = formErrorText(...).
  - Passthrough: autoComplete, textContentType, maxLength, ltr, secureTextEntry, keyboardType.
  - Do not edit ui/form/Field, which open PR #1296 rewrites (its onBlur becomes `() => void`, still compatible). Rebase if #1296 merges first.
- **src/ui/form/FormFrame/** (same 6 entries):
  - A View with gap from `space` tokens, then children, then an ErrorLine for each form-level issue.
  - Then the primitives Button with label = busy ? busyLabel : submitLabel, busy = isSubmitting, onPress = a hook handler (isSubmitting guard, then `void form.handleSubmit()`), and variant and accessibilityLabel passed through.
  - Disabled under the same rule as web.
- **src/account/use-account-action.ts**: add `send: mutation.mutateAsync`.
- **Exports**: useAppForm from src/ui/index.ts.

== PILOTS ==

**WEB.** apps/staff-web/src/features/people/account/sections/NameSection.tsx becomes a folder NameSection/ with NameSection.tsx, use-name-section.ts, index.ts and its test.
- Import AccountSection as `@/features/people/account/sections/AccountSection` (no ../).
- Add `send: mutation.mutateAsync` to use-account-save.ts.

```ts
export function useNameSection({ profile, onDone }: SectionProps) {
  const save = useAccountSave({ save: updateProfile, toast: t.account.toast.name, onDone });
  return useAppForm(routeForm({ route: accountRoutes.updateProfile,
    defaultValues: { full_name: profile.full_name }, send: save.send }));
}
// NameSection.tsx
<AccountSection title={N.title}><form.AppForm>
  <form.FormFrame submitLabel={t.account.save} busyLabel={t.account.saving} variant="secondary"
    messages={t.account.errors} changesOnly>
    <form.AppField name="full_name">{(f) => <f.TextField label={N.label} hint={HINT} required
      messages={t.account.errors} autoComplete="name" maxLength={ACCOUNT_NAME_MAX + 20} />}</form.AppField>
  </form.FormFrame></form.AppForm></AccountSection>
```

Delete nameErrors and its 3 assertions in account-validation.test.ts; the profileUpdateSchema tests cover the rule.

**MOBILE.** apps/staff-mobile/src/account/sections/NameSection.tsx becomes NameSection/ with NameSection.tsx, use-name-section.ts and index.ts. Prune its oxlint-suppressions.json entry; the new file has none.

```ts
const action = useAccountAction({ run: patchProfile, success: t.account.toast.name });
const form = useAppForm(routeForm({ route: accountRoutes.updateProfile,
  defaultValues: { full_name: profile.full_name }, send: action.send }));
// NameSection.tsx
<AccountCard title={t.account.name.title} notice={action.notice}><form.AppForm>
  <form.FormFrame submitLabel={t.account.save} busyLabel={t.account.saving} variant="secondary"
    accessibilityLabel={`${t.account.save} — ${t.account.name.title}`} messages={t.account.errors} changesOnly>
    <form.AppField name="full_name">{(f) => <f.TextField label={t.account.name.label} hint={hint}
      messages={t.account.errors} autoComplete="name" textContentType="name"
      maxLength={ACCOUNT_NAME_MAX + 20} />}</form.AppField>
  </form.FormFrame></form.AppForm></AccountCard>
```

AccountCard gets no onSave, so there is one button. It stays secondary, per docs/07 §1.4.

**Accepted behaviour changes** (state them in the PR):
- changesOnly compares the raw value. Adding only spaces to an unchanged name now enables save, which then sends the same trimmed name.
- On mobile a client-invalid submit no longer clears an earlier success notice, because onMutate does not run.
- A domain code shows on the form line, never under a field.

**How each kind of error is shown**
- **Client validation** runs on submit only. Issues on mounted fields show under the field. Root issues (empty_update) and unmounted paths show in FormAlert (web) or ErrorLine (mobile).
- **Server 400**: the same rule for its issues.
- **Domain code**: messages[code], else common.error.
- **No answer**: common.noAnswer.
- **bad_response**: common.savedUnread.
- **Clearing**: an edit clears that field's error and the whole form line (TanStack). The next submit recomputes everything, and the form never re-sends by itself.

== TESTS FIRST ==
Write each test red first, and list «behaviour -> test» in the PR body.

**1. client-core core/form/tests/** (vitest; at least 90% lines and 80% branches)
- **route-form.test.ts**
  - An invalid body returns field errors and does not call send.
  - A valid body sends the parsed output (' Ali ' becomes 'Ali').
  - It resolves undefined on success.
  - A rejection returns failureErrors.
  - A root issue and an unmounted path go to form only, and fields has no such key.
  - form is undefined when there are only field errors.
- **failure-errors.test.ts**
  - A real 400 body `{message:'validation_failed', code:'validation_failed', issues:[{path:'full_name', message:'name_too_short'}]}` gives fields.full_name; issues win over the code.
  - 'items.0.name' becomes 'items[0].name'.
  - '' goes to form[''] only.
  - 409 {code:'phone_taken'} gives form[''].
  - The real bad_response body `{code:'bad_response', path:'/me/profile', issues:['x']}` gives 'bad_response'.
  - TypeError, ApiError 503 with {code:'service_unavailable'}, and a plain Error all give 'no_answer'.
  - An ApiError 4xx with a non-object body gives 'error'.
- **issue-key.test.ts**
  - Each MESSAGE_KEYS entry.
  - Real zod 4 issues from safeParse: invalid_type gives required; too_small on a string with min 1 gives required, with min 2 gives invalidValue; an unknown zod code gives invalidValue.
  - An issue with no code gives error; a non-object gives error.
- **route-form.types.test.ts** (expectTypeOf, no @ts- escapes)
  - defaultValues is RouteBody<typeof accountRoutes.updateProfile>.
  - `expectTypeOf<typeof accountRoutes.profile>().not.toExtend<BodyRoute>()`.
  - {full_name} is accepted despite the preprocess phone_e164 key.

**2. web-kit components/form/*/tests** (vitest + RTL; real useAppForm + routeForm + accountRoutes.updateProfile, send stub)
- 'A' shows t.account.errors.name_too_short under the field with aria-invalid and aria-describedby, and send is not called.
- A valid submit calls send once with the trimmed output.
- A server 400 issue lands under the field.
- 409 code text shows in FormAlert via messages.
- An unknown server path shows in FormAlert, AND a second submit after an edit calls send again (the lock regression).
- An edit clears the field error and the form line.
- A double submit while pending sends once, by calling the submit handler twice, not only by clicking the disabled button.
- no_answer shows common.noAnswer.
- changesOnly disables the button until an edit.
- The busy label shows and the button is disabled while pending.
- `expectTypeOf<'fulname'>().not.toExtend<DeepKeys<RouteBody<typeof accountRoutes.updateProfile>>>()`.

**3. mobile-kit ui/form/*/tests** (jest-expo + RN testing library)
- The same cases: press the Button, ErrorLine has role alert, busy is shown, and accessibilityLabel is the button name.

**4. Pilots**
- The existing NameSection.test.tsx and AccountScreen.test.tsx assertions stay unchanged (trimmed body, t.account.save, t.account.saving, saveIn label). Move NameSection.test.tsx into the folder. Add the lock-regression case to one pilot.

**Mutation testing**: there is no Stryker config on develop. Do not create one in this lane. Name issue-key and failure-errors in the PR body as the mutation-test targets for the Stryker setup lane.

== DESIGN REVIEW ==
- TextField and FormFrame in each kit get a Name.showcase.tsx covering states, RTL/LTR, dark, reduced motion, a 44 px target, role alert and a11y labels.
- mobile-kit has a precedent (Sheet.showcase.tsx); web-kit has none yet, so add the first one plainly.
- The review stage loads heuristic-evaluation, design-qa-checklist and critique-brand-consistency.
- There are no new visuals; the components only compose Field, Input, FormAlert, Button, ErrorLine and the moved AccountField markup.

== PR SPLIT ==
PR 2 and PR 3 run in parallel after PR 1. One pilot per platform only; the other web and mobile forms and the feature error mappers move in later lanes.
1. `feat(client-core): add route form options that validate with the route body schema`
   - Includes the 3 i18n keys (ar + en).
2. `feat(web-kit): add route form text field and frame on tanstack form`
   - Includes the staff-web NameSection pilot and the useAccountSave send.
3. `feat(mobile-kit): add route form text field and frame on tanstack form`
   - Includes the dependency (reason in the PR body), HintedField and AccountField, useAccountAction send, the staff-mobile pilot and the suppression prune.
   - Gate: CI «bundle mobile» and «test mobile».
   - Rebase on #1296 if it merges first.

== UNPROVEN UNTIL CI TYPECHECK ==
- **FormApiLike.** Is TanStack's formApi (fieldInfo: Record<DeepKeys<T>, FieldInfo>) assignable to the structural FormApiLike param? Fallback: the kits wrap routeForm and pass isPlaced from the form instance; never a cast.
- **DeepKeys** of a type with `phone_e164?: unknown`: does the typo test hold?
- **z.function inside z.record().decode** in zod 4.6.5. Fallback: a decode table from FormErrorKey to the i18n key name, read from t.common at call time.
- **The react-dom peer warning** in the mobile-kit importer.

== OPEN OWNER QUESTIONS ==
1. Is @tanstack/react-form OK as a new third-party dependency of mobile-kit? The alternative is a hand-made form store on mobile only.
2. Wording of the 3 new keys in ar and en.
3. Should changesOnly (unchanged = save off) stay as the pilots do today?
4. Sending the parsed output instead of the raw input. The default keeps today's trimmed payloads and tests; the other option sends raw input and changes the pilot assertions.