### Deriving variants from one schema

The owner asked for this on 2026-11-25: «write zod schema once in packages and use type inference to get the types in both the front and the back also add some functions to get partial or resolve full schema». This section adds two functions and one predicate to core, adds one naming role, and specifies two lint rules. Paths are from origin/develop `f90abe03c`. I got the zod claims by reading the zod 4.6.5 source and its shipped tests (`src/v4/core/schemas.ts`, `core/util.ts`, `classic/schemas.ts`). I compiled none of it and ran none of the code below. The red tests in A prove or disprove each claim.

#### Why zod's own methods are not enough

- **`.partial()` puts the defaults back.** `$ZodOptional` still runs an inner `.default()` or `.prefault()` when a key is missing (`core/schemas.ts:3902-3925`, pinned by `optin-ladder.test.ts:163` and `partial.test.ts:152,162`). `.exactPartial()` and `z.deepPartial()` fill them in too. The repo works around it in three ways:
  - `sentOnly` (`common/http/http.ts:16-17`);
  - a second student PATCH schema whose comment says a `{ level }` PATCH «came back with status 'new' / program 'quran'» (`students.dto.ts:26-29`);
  - hand-written updates («a .partial() would re-apply defaults», `money/src/ledger/schemas.ts:101`).
- **A refined object can't be derived from.** `.pick()`, `.omit()`, `.partial()` and `.merge()` throw on it. `.extend()` throws when a key overlaps (`core/util.ts:757-899`). `.refine()` returns `this`, so the call type-checks and then throws at runtime. That is why 8 update schemas copy their create fields by hand (payment, subscription, expense, role, saved reply, number, short link, user).

#### The pattern

1. **One unrefined base object per entity.** It holds every field, defaults included.
   - When the create body has no object-level rule, the base is the create schema itself. `guardianCreateSchema` keeps its name, so no importer gets renamed.
   - Otherwise the base takes the new role **`Fields`** in «Naming», as in `shortLinkFieldsSchema`. It is never used on a route. It is exported only when another file derives from it. Four entities need one: expense, number, short link, user.
2. **Cross-field rules are named, exported predicates**, the way `callsNeedKapso` and `evolutionModeFits` already are.
   - Only the exported edge schema calls `.refine(predicate, …)`.
   - A PATCH body never carries those rules, because it lacks the keys they read. Instead the service runs the same predicate on `{ ...row, ...patch }`. `numbers.service.ts:19-21,61` already does this for `callsNeedKapso`, and `numbers.patch.ts:12-18` switches from its own copy of `evolutionModeFits` to the exported one.
3. **Variants:**
   - `.pick()`, `.omit()` and `.extend()` on the base are zod's own.
   - `partialOf(base)` builds the PATCH body.
   - `.refine(hasAnyValue, '<today's message>')` goes on the edge. Each schema keeps its message: `'empty'` for numbers, `'empty_update'` for the rest.
   - Where a variant is a permission boundary, it keeps `.pick()`. With `.omit()`, a field added later would become editable without anyone deciding it (`peopleGuardianPatchSchema`).
   - For «every key required», zod's `.required()` already keeps checks and never throws (`partial.test.ts:395-447`), so there is no helper.
4. **No `{ full, partial, pick, omit }` bundle.** Each member would wrap one zod call. I don't use `z.deepPartial` either: it calls `.partial()` on every nested object, so it puts defaults back, throws on a refined nested object, and turns a discriminated union into a plain union.
5. **Views are a second schema.** Part 2 bans `phoneE164`, `optionalText` and `timeZone` in response schemas, so a `View` or `Row` can't be derived from a request base. It shares enum schemas and core primitives, nothing more. «Write once» covers the request variants only.

#### Helpers: `packages/core/src/schemas/derive/` (PR A)

```
derive/
  index.ts            export * from './derive'; export type * from './derive.types';
  derive.ts           partialOf, resolveObject, hasAnyValue
  derive.types.ts     NoDefault, PartialOf, Wrapper, ResolvedObject
  tests/partial-of.test.ts, tests/resolve-object.test.ts, tests/derive.types.test.ts
```

Core still depends only on zod, and `schemas/index.ts` adds `export * from './derive'`.

Sketch, not compiled:

```ts
// derive.types.ts
import type { z } from 'zod';

export type NoDefault<T extends z.core.SomeType> = T extends z.ZodDefault<infer I extends z.core.SomeType>
  ? I
  : T extends z.ZodPrefault<infer I extends z.core.SomeType>
    ? I
    : T;

export type PartialOf<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig> = z.ZodObject<
  { -readonly [K in keyof S]: z.ZodOptional<NoDefault<S[K]>> },
  C
>;

export type Wrapper<I extends z.core.SomeType> =
  | z.ZodOptional<I>
  | z.ZodNullable<I>
  | z.ZodDefault<I>
  | z.ZodPrefault<I>;

export type ResolvedObject<T> = T extends z.ZodObject
  ? T
  : T extends z.ZodPreprocess<infer B>
    ? ResolvedObject<B>
    : T extends z.ZodPipe<infer A, z.core.SomeType>
      ? ResolvedObject<A>
      : T extends Wrapper<infer I> ? ResolvedObject<I> : never;
```

```ts
// derive.ts
import { z } from 'zod';
import type { PartialOf, ResolvedObject, Wrapper } from './derive.types';

const withoutDefault = (field: z.core.$ZodType): z.core.$ZodType =>
  field instanceof z.ZodDefault || field instanceof z.ZodPrefault ? field.unwrap() : field;

/** `base.partial()` minus its defaults: a PATCH of one field never resets another. */
export function partialOf<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig>(
  base: z.ZodObject<S, C>,
): PartialOf<S, C> {
  // zod's own extend error here would advise .safeExtend(), which keeps the refine on a partial body.
  if (base.def.checks?.length) throw new Error('partialOf: refine the edge schema, not the base');
  const fields = Object.entries(base.shape).map(([key, f]) => [key, z.optional(withoutDefault(f))]);
  // Object.fromEntries drops per-key types; PartialOf maps S the same way (derive.types.test.ts).
  return base.extend(Object.fromEntries(fields)) as unknown as PartialOf<S, C>;
}

/** The empty-update rule of PATCH bodies; each schema keeps its own message. */
export const hasAnyValue = (body: object): boolean =>
  Object.values(body).some((v) => v !== undefined);

const WRAPPERS = [z.ZodOptional, z.ZodNullable, z.ZodDefault, z.ZodPrefault];
const isWrapper = (s: z.core.$ZodType): s is Wrapper<z.core.$ZodType> =>
  WRAPPERS.some((kind) => s instanceof kind);

function innerOf(schema: z.core.$ZodType): z.core.$ZodType {
  if (isWrapper(schema)) return schema.unwrap();
  if (schema instanceof z.ZodPipe) return schema instanceof z.ZodPreprocess ? schema.out : schema.in;
  throw new Error('resolveObject: no object behind this schema');
}

/** The object behind optional, nullable, default, prefault, preprocess and transform. */
export function resolveObject<T extends z.core.SomeType>(schema: T): ResolvedObject<T> {
  let current: z.core.$ZodType = schema;
  while (!(current instanceof z.ZodObject)) current = innerOf(current);
  // The loop takes ResolvedObject's branches one for one (derive.types.test.ts).
  return current as unknown as ResolvedObject<T>;
}
```

- **`partialOf`** builds on `base.extend()`, which keeps the base's strict or loose config and its key order. zod writes the source keys first and then overlays the new ones (`core/util.ts:820-830`). It unwraps a top-level `.default()` and a top-level `.prefault()`, because both run on the same «defaulted» rung.
  - A default nested inside another wrapper, like `.default(x).nullable()`, still fills. Develop has 0 of those. A test pins the limit.
  - In `z.toJSONSchema(…, { io: 'input' })` the result has no `required` and no `default`. It gets `additionalProperties: false` only when the base is strict.
- **`resolveObject` does not remove refinements.** A refined object behind `z.preprocess` comes back refined, and `.partial()` or `partialOf` on it still throws. It covers only the wrapper kinds develop puts around whole objects:
  - preprocess: `blanksToNull` ×7, `withPackageSize` ×1, `ZodBody`'s `orEmpty`;
  - optional: `guardianCreateSchema.optional()` and 3 more;
  - nullish: 1;
  - default: `leadQualificationSchema.default({})`;
  - prefault: 3 in reports v2;
  - transform: `familyMoveSchema`'s two options.

  Develop has 0 readonly, codec and catch wrappers around an object, so the helper leaves them out. Develop also has 0 callers today. It ships because the owner asked for it, and C1 uses it where a form holds only the edge schema (the per-field checks below).
- **Two assertions, both `as unknown as`.** Each sits on a return type that TS can't compute through `Object.fromEntries` or a loop. zod does the same in `deepPartial` (`classic/deep-partial.ts`), and so does the repo's `gradesShape` (`shared/src/reports/schema/schema.ts:15`). `settingsUpdateSchema` is different. Its cast (`settings/src/validation/schema/schema.ts:64`) claims a hand-written type the schema can drift from. Here both types are computed from the argument's own type, and type tests pin them.
- **The cast-free alternative is worse.** It keeps defaults only on the create edge, so every defaulted key gets written twice, which goes against «write once». I chose the single checked cast.

#### Types on both sides

| Need | Api handler | Client |
|---|---|---|
| Create body | `body: GuardianCreate` (`z.infer`) | `GuardianCreateInput` (`z.input`: defaulted keys optional) |
| Patch body | `body: GuardianUpdate` | `z.input<typeof guardianUpdateSchema>` |
| Form state | n/a | `Record<keyof GuardianUpdate, string>` replaces the key lists in `GuardianValues`, `FamilyForm` and `StudentForm` (`people-edit-form.ts:13-28`) |
| One field's check | n/a | `resolveObject(body).shape.phone_e164.safeParse(v)`, whose issue message is the `PhoneResult` reason (`core/schemas/common.ts:4`), replaces `phoneError`; `.shape.age` replaces the `parseAge` copy of 3..99 |
| View | `asResponse(guardianViewSchema, …)` returns `GuardianView` | `apiFetch(path, { schema: guardianViewSchema })` returns `GuardianView` |

- `z.input` of a `blanksToNull(...)` body is `unknown`. `ZodPreprocess<U, B>` takes its input from the callback's argument (`classic/schemas.d.ts:816`).
- C1 moves `blanksToNull` into a package and types the callback as `(value: z.input<S>) => blankToNull(value)`. After that the wrapped body's input is the base's input. The client still infers from the base or uses `resolveObject`.
- No hand-written body type remains for the 15 pairs.

#### Tests (rule 14, red first)

`partial-of.test.ts`:
- A `{ name }` body on a base with `status: …default('active')` parses to `{ name }`. Next to it, `base.partial()` gives `status: 'active'`, which pins zod's behaviour, so an upgrade that changes it shows up.
- The same holds for `.prefault()`.
- `partialOf(base.strict())` rejects an unknown key.
- `Object.keys(partialOf(base).shape)` equals the base's keys.
- A field-level check still applies (`age: z.int().min(3)` rejects 1).
- A refined base throws `partialOf: refine the edge schema, not the base`.
- `.default(x).nullable()` still fills (the limit above).
- `.refine(hasAnyValue, 'empty_update')` answers that issue for `{}` and for `{ phone_e164: '' }` behind a blank-to-undefined preprocess (`userUpdateSchema`'s case).
- `toJSONSchema(…, { io: 'input' })` has no `required` and no `default`.

`resolve-object.test.ts`:
- Each covered wrapper returns the same instance (`toBe(base)`): optional, nullable, nullish, default, prefault, preprocess (its `.out`) and transform (its `.in`).
- A refined object behind a preprocess comes back, and `.partial()` on it throws `.partial() cannot be used on object schemas containing refinements`.
- A union or an array throws.

`derive.types.test.ts` (`expectTypeOf`, the way `apps/api/src/common/db/catalog-enum-parity.test.ts` does it, 23 files in all):
- `z.output` and `z.input` of `partialOf(base)` equal those of `const zodPartial = base.partial()`. The types match zod's own; only the runtime differs.
- `partialOf(base.strict())` extends `z.ZodObject<z.core.$ZodShape, z.core.$strict>`.
- `resolveObject(z.preprocess((v: z.input<typeof base>) => v, base.optional()))` is `typeof base`.

Under `vitest run`, `expectTypeOf` does nothing. Core's `tsconfig.json` includes `src`, test files too (`tsconfig.build.json` excludes them only from the build), so «red» for a type test means the CI typecheck job (`tsgo --noEmit`) fails.

#### Adoption by pair

Every pair keeps the same key set and accepts the same values, so the wire doesn't change. A mask written in today's key order keeps `contracts.snap.json` byte-identical. Three PATCH bodies get expected snapshot diffs, committed on their own as `test(contracts): derived PATCH bodies`: teacher (`"default": "active"` leaves `status`), expense (key order) and number (key order). Any other snapshot diff stops the PR.

| Pair | After | Notes | PR |
|---|---|---|---|
| Guardian | `partialOf(guardianCreateSchema)` | no defaults, identical | C1 |
| Student PATCH | shared `studentUpdateSchema = partialOf(studentCreateSchema.omit({ guardian_id: true })).extend({ expected_status })` | the api's `studentPatchSchema` is deleted, so the route has one schema; check that `profile-form.ts:79` sends `program` and `status` | C1 |
| Teacher | `partialOf(teacherCreateSchema).extend({ username: username.nullish() })` | the `sentOnly: true` option goes from `teachers.controller.ts:71` | C1 |
| Payment | `partialOf(paymentCreateSchema.extend({ method: z.enum(ALL_PAYMENT_METHODS) }).pick({ amount, method, paidAt, receiptPath, note }))` | the widened `method` stays | C1 |
| Subscription | `partialOf(subscriptionCreateSchema.pick({ renewsOn: true, notes: true }))` | | C1 |
| Expense | `partialOf(expenseFieldsSchema).extend({ isDraft: z.literal(false).optional() })`; create is `expenseFieldsSchema.refine(monthOrPaidOn, …)` | key order changes | C1 |
| User | `partialOf(userFieldsSchema.extend({ phone_e164: <nullable>, role_id: z.uuid().nullable() }).pick({ email, full_name, phone_e164, locale, tz, role, role_id })).refine(hasAnyValue, 'empty_update')` | | C1 |
| Assistant edit (2) | `partialOf(x.pick(...))`, `.strict()` kept | | C1 |
| Number | `partialOf(numberFieldsSchema.extend({ is_default, fallback_rank })).refine(hasAnyValue, 'empty')` | `numbers.patch.ts` imports `evolutionModeFits`; key order changes | C2 |
| Saved reply | `partialOf(savedReplyCreateSchema.omit({ scope: true }))` | | C2 |
| Short link | below | | C2 |
| Job applicant | `partialOf(jobApplicantCreateSchema.omit({ phone_e164: true, status: true, from_lead_id: true })).refine(hasAnyValue, 'empty_update')` | only the api imports it, so its local omit and refine move into the shared schema | C2 |
| Lead | `leadCreateSchema` and `leadUpdateSchema` are deleted (only `schemas.test.ts` uses them); `leadQualificationPatchSchema = partialOf(leadQualificationSchema)` | | C2 |
| Role | `partialOf(roleCreateSchema.pick({ name_ar: true, name_en: true, permissions: true }))` | catalog already depends on `@ab/core` | C2 |
| Other `.partial()` | `evolutionFieldsSchema` spread (`numbers/schemas.ts:34`), report grades (`reports/schema/schema.ts:30`), 2 staff-web error-body reads | no defaults, identical | C2 |

What happens to the 9 `sentOnly` sites:
- Teacher's goes with the conversion.
- Expenses, payments and subscriptions have no defaults today, so their 3 calls are already no-ops. They go, each with a route test pinning that a missing key stays missing.
- The 4 report-draft sites stay. `reportDraftSchema` and `reportV2DraftSchema` sit on `.prefault({})` and are not create/update pairs.
- The other `sentOnly` in `users.logic.ts:116` is a different function and stays.

**Question for the owner (adds to §7).** Today a PATCH to a short link is not checked against `users_required` on the merged row: a link set to `listed` can be patched to no users. Should the service run `usersGiven({ ...row, ...patch })`? If yes, that is a new 400, a wire change outside the approved set.

#### Lint rules (turn on in C2 at zero, no baseline)

| Rule | Matches | Today | Zero in |
|---|---|---|---|
| `ab/no-zod-partial` | any `.partial(` or `.exactPartial(` call, and `z.deepPartial(`, in `packages/*/src` and `apps/*/src`; `partialOf` itself uses `extend` | 14 (packages 11, api 1, staff-web 2); every grep hit is zod | C1 + C2 |
| `ab/derived-update-body` | a `const` named `<F>UpdateSchema`, `<F>UpdateBodySchema` or `<F>PatchSchema` in a file that declares or imports `<F>CreateSchema` or `<F>CreateBodySchema`, whose initializer chain doesn't start at `partialOf(` | 14 of the 23 update/patch schemas; the other 9 have no create sibling (rule, config entry, settings ×2, profile, locale, 2 assistant edits, lead qualification) and never match | C1 + C2 |

Both rules check identifier names and imports in the AST. They use no exempt globs. Neither one catches an update named outside the convention, such as `editShortLinkSchema`, or a pair split across files with no import between them. «Naming» makes the name the convention, so catching drift there is review's job.

#### Sketch: guardians, teachers, short links (not compiled)

```ts
// packages/shared/src/people/guardians/guardians.schemas.ts
export const guardianCreateSchema = z.object({
  name: requiredText,
  phone_e164: phoneE164,
  country: optionalText,
  tz: timeZone,
  source: z.enum(LEAD_SOURCES).nullish(),
  notes: optionalText,
});
export const guardianUpdateSchema = partialOf(guardianCreateSchema);
/** The assistant's edit: an allowlist, so a new field is never editable by default. */
export const peopleGuardianPatchSchema = partialOf(
  guardianCreateSchema.pick({ name: true, phone_e164: true, country: true, tz: true, notes: true }),
).strict();
export type GuardianCreate = z.infer<typeof guardianCreateSchema>;
export type GuardianCreateInput = z.input<typeof guardianCreateSchema>;
export type GuardianUpdate = z.infer<typeof guardianUpdateSchema>;

// apps/api guardians.controller.ts: same schema, output types
const updateBody = blanksToNull(guardianUpdateSchema);
// @Patch(':id') update(@ZodParam('id', id()) id: string, @ZodBody(updateBody) body: GuardianUpdate)

// apps/staff-web guardian-form.ts: same schema, no hand-written types
export type GuardianValues = Record<keyof GuardianUpdate, string>;
```

Guardians has no defaults and no refines, so `partialOf` changes nothing at runtime there. The other two show what it is for:

```ts
// teachers: `status` default 'active' no longer fills a PATCH
export const teacherUpdateSchema = partialOf(teacherCreateSchema).extend({ username: username.nullish() });

// short links: unrefined base, named rule, refine only on the edges
const shortLinkFieldsSchema = z.object({
  title,
  targetUrl,
  expiresAt: instant.optional(),
  maxUsers: maxUsers.default(null),
  audience: z.enum(SHORT_LINK_AUDIENCES).default('anyone'),
  profileIds: profileIds.default([]),
  phones: phones.default([]),
  sendWhatsapp: z.boolean().default(false),
});
type ShortLinkFields = z.infer<typeof shortLinkFieldsSchema>;
export const usersGiven = (v: ShortLinkFields): boolean => !needsUsers(v) || hasUsers(v);
export const shortLinkCreateSchema = shortLinkFieldsSchema.refine(usersGiven, {
  message: 'users_required',
  path: ['profileIds'],
});
export const shortLinkUpdateSchema = partialOf(
  shortLinkFieldsSchema.pick({ title: true, expiresAt: true, maxUsers: true, profileIds: true, phones: true }),
).refine(hasAnyValue, { message: 'empty_update' });
```

In the short-link PATCH the keys, values and order match today's hand-written schema. `maxUsers` loses its `.default(null)` and stays nullable. The ten restated lines become one mask.
