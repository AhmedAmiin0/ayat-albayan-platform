# 63 · One folder per component, with a local hook

Plan for: «for the frontend i want the logic to have each component in its own folder so Component and this folder have the component file and component types and a hook for the logic that being used only locally inside the component» (owner, 2026-11-25). Counts were read on develop `83066331f` with a regex scan; every PR recounts on current develop.

## Decisions (owner, 2026-11-25)

- **Q1 yes:** `Name.tsx` may call `useTheme()`, and a component that calls no other hook gets no `use-name.ts` (value consts stay; function literals go to `<name>.helpers.ts`).
- **Q2 yes:** every component the codemod changes is covered by a test before its logic moves (docs/59 §3 class B, rule 14).
- **Q3 yes:** `*-icons.tsx` files that hold only pure SVG components stay one file.
- **No `.js` in imports** (owner, 2026-11-25: «i dont want to import .js files»): packages and apps alike use extensionless relative imports; the packages infra PR (docs/64) lands first.
- **Order:** the eight PRs in §5, starting after #937 (oxlint only) and the docs/64 infra PRs merge. PRs 6 and 7 (staff-web) start only after docs/62's C2 merges, because both edit staff-web hooks and client-core.
- **Reviews.** `move/components-*` PRs auto-merge when green (`guard:move-only` is the proof). Every other PR to develop is reviewed once by the hourly conductor when every check is green, then labelled `reviewed` + `auto-merge`. Domain sub-PRs into a `bundle/components-*` branch are merged by the driver that builds them.

Base: origin/develop `83066331f` (2026-11-24 23:39 UTC). `bundle/refactor-one-pass` is already merged (#960 → `e8d1550b7`), and so are all `chore/comments-arabic-*` branches (#896–#927, #955, #958). The open PRs are #937 `build/oxlint-only` (406 files, about 145 of them frontend), #928 `ci/no-arabic-comments` (15 files) and #829 (api). `nest/all-modules` has no PR yet: it is 8 commits ahead, and 848 of its 856 files are in `apps/api`. Every count below comes from a regex scan of `83066331f` (§8), so they are estimates, not AST counts.

## 1. Rule text

### CLAUDE.md rule 16, component part (replaces the current rule 16 line)

> 16. **Components** (R2–R5): each component has its own folder `Name/`: `Name.tsx` (one component: an optional `useTheme()`, then one call to
> its own `useName` or, with no hook, plain value consts; guards; JSX; an inline handler is one call), `Name.types.ts` (props and hook types),
> `use-name.ts` (its logic: every other hook, state, refs, queries, derived values, handlers; only when it calls a hook; imported only inside
> `Name/`) and `index.ts` (exports `Name` and whatever code outside imports, never a hook); tests in `tests/` when 2+. A sub-component gets
> its own folder inside its parent's; route files only map a URL to one page. Reusable UI lives in `packages/web-kit` / `packages/mobile-kit`,
> shared web + mobile logic in `packages/client-core` (`pnpm guard:components`, docs/57 §2.12).

Rule 21 does not change. It keeps «the rest live in named shared hooks», so a local hook may call a shared effect hook but holds no raw `useEffect` itself.

### docs/57 changes

- §2, the `use-x.ts` row becomes: «a component's own logic: `Name/use-name.ts`; a hook that 2+ components share: `use-x.ts` beside them, named for its purpose».
- §2.1: `button/` becomes `Button/`. The index line becomes `export { Button } from './Button'; export type { ButtonProps } from './Button.types'`, because a type is exported only when outside code imports it.
- §2.2: `search-field/` becomes `SearchField/`.
- Append **§2.12 Component folder and local hook**. Sections §2.4–2.11 already exist and keep their numbers.

**§2.12 Component folder and local hook**

```
apps/staff-web/src/features/people/roles/RoleDialog/
  RoleDialog.tsx          // export function RoleDialog(p: RoleDialogProps) { const {…} = useRoleDialog(p); if (…) return …; return <Dialog…/> }
  RoleDialog.types.ts     // RoleDialogProps, plus any named type the hook needs
  use-role-dialog.ts      // useQueryClient, useId, useState ×4, useMutation ×2, done/submit/onDelete/onReset, derived values
  role-dialog.helpers.ts  // module values and pure functions that the JSX, guards or parameter defaults read
  index.ts                // export { RoleDialog } from './RoleDialog'
  tests/RoleDialog.test.tsx
  PermissionRow/          // a private sub-component, nested in its parent's folder
```

| `use-name.ts` (logic) | `Name.tsx` (view) |
|---|---|
| Every hook call except `useTheme`: state, refs (`xRef`), context, router, i18n hooks, TanStack, `useId`, `useViewerTz`, `usePermissions` | At most `const { … } = useTheme()` and `const { … } = useName(arg)` |
| Derived values, setState-during-render resets, and named handlers (anything with a condition or more than one step) | Guards `if (x) return …;` that read only names from the hook, the theme or the props |
| Calls shared hooks (`useTimeout`, client-core `queryOptions`); never `apiFetch` / `apiSend` or a raw effect | The JSX return |
| Returns one object holding exactly the names the guards and JSX read | With `useName`, no other statement. Without it, only value consts (no function literal, no hook call). No types, extra exports or array derivations |

**JSX arrows in `Name.tsx`:**
- An arrow whose body is JSX or conditional JSX is allowed: render props, `renderItem`, `.map(r => <Row/>)`. Arrows nested inside it are checked by the same rules.
- Any other arrow is one expression with no `?:`, `&&`, `||` or `??` and no nested function. It is a call (object and spread arguments allowed), `void call(…)`, or an accessor such as `(c) => c.id`.
- JSX contains no `filter`, `sort`, `toSorted`, `reduce`, `find`, `some`, `every` or `flatMap` calls. Those derivations belong in the hook.

**A component with no hook** (no hook besides `useTheme`) gets no `use-name.ts`. The reason is the React Compiler's default `infer` mode, which this repo uses: `packages/config/vite.js` `reactCompilerPreset()` and `packages/mobile-kit/babel.cjs` pass no options. In that mode, a `use*` function that calls no hook and creates no JSX is not compiled. This follows the compiler's `getComponentOrHookLike`; PR0 checks it with a fixture.
- Value-only `const`s (no function literal) stay in `Name.tsx`, where the compiler memoizes them.
- Any function literal moves to a pure function in `<kebab>.helpers.ts`, unit-tested without `renderHook`.

**Local hook files:**
- A local hook takes at most 3 arguments (rule 2). A generated hook takes one.
- If `use-name.ts` would pass 50 lines, it calls more `use-<purpose>.ts` files in the same folder.
- `Name.tsx` calls only `use-name.ts`.
- Every local hook is imported only from inside `Name/`.

**Exceptions:**
- Route files (TanStack `src/routes/**`, expo-router `app/**`) have their own check (§3, check 9).
- `*.showcase.tsx`, `*.testing.tsx`, tests, `test/`, `testing/` and fixtures.
- `*-icons.tsx` (Q3).

**File suffixes** (`x` is the component's kebab-case name):

| Suffix | Holds |
|---|---|
| `x.helpers.ts` | Module values and pure functions |
| `x.style.ts` | `StyleSheet.create` |
| `x.variants.ts` | `cva()` |
| `x.context.ts` | `createContext` |

## 2. Decisions and reasons

- **Strictness.** `Name.tsx` may call exactly two hooks: `useTheme()` and its own `useName`.
  - `useTheme` looks up style tokens; it is not logic. `useTheme(` appears 607 times in mobile `.tsx` files.
  - Only 27 components, across all workspaces, have other context reads (`useViewerTz`, `useId`, `usePermissions`, `useNow`, `useClock`, `useNavigate`) as their only statements. Allowing one name is therefore the right line, and those 27 get a small hook each.
  - i18n `t` is a static import (`@ab/web-kit/lib/i18n/i18n`, `mobile-kit/src/lib/i18n/i18n`), so JSX keeps reading `t.x` directly.
  - If `S` (the statements before the first return) also reads the theme, `useTheme` moves into the hook.
- **No hook needed.** A component that calls no hook besides `useTheme` gets no hook file, for the compiler reason in §1.
  - Estimated counts: staff-web 645, staff-mobile 474, family 100, web-kit 163, mobile-kit 174.
  - 194 of these hold function literals before the return. Those become `.helpers.ts` functions, written by hand.
- **Multi-component files** (about 434 files with 2+ components).
  - Each extra component gets its own folder nested in the parent's (`SlotStep/SlotRow/`). This keeps the parent folder's sub-folder count and avoids name clashes (web-kit has four components named `Body`).
  - Gate components (WithPick/Picked, CodeGate/CodeChoices, ClassroomRoom/Call) keep separate folders and hooks, so no hook runs conditionally.
- **Compound components.** None exist today.
  - Parts share state through `x.context.ts`. Static assignments such as `Tabs.List = …` are not allowed.
  - `Name.displayName = '…'` is the one extra top-level statement allowed.
- **Context providers.**
  - `createContext` goes in `x.context.ts`.
  - The provider's value is built in `use-name.ts`, and `Name.tsx` renders the provider.
  - Switching `.Provider` to `<Ctx value>` stays with the React 19 lane (`react19: false` in `packages/config/lint-web.js`).
- **TanStack routes** (staff-web 90 files, family-web 18). The router plugin treats every `.tsx` under `routes/` as a route, so `Name/` folders cannot go there.
  - A route file holds router config (`createFileRoute`, `beforeLoad`, `loader`, `validateSearch`) and at most one adapter component.
  - The adapter calls only `Route.use*` / `getRouteApi` and returns one page element.
  - 9 staff-web route files call other hooks; no family-web route file does. Their logic moves into the page's `use-name.ts`, which reads the URL through `getRouteApi('/…')`. Importing `Route` there would create a cycle through `routeTree.gen.ts`.
- **expo-router `app/`** (staff-mobile 181 files, family-mobile 18). Each file is a re-export, or one component returning one element, plus `ErrorBoundary`.
  - 11 staff-mobile files call hooks. Each moves its component into `src/<feature>/XRoute/` with a `use-x-route.ts`. Examples: `app/(tabs)/_layout.tsx` (4 hooks), `app/_layout.tsx` (GatedRoot) and `app/login.tsx`.
  - This is hand work, done tests-first in the staff-mobile bundle using the existing `src/core/nav/routing.*.test.tsx`. It is never part of a `move/*` PR.
- **Kits and apps.** The same layout applies in both.
  - Generic UI in the apps is folded in place. The R4 lane (`ab/ui-in-kit`) later moves each whole folder with one `git mv`.
  - Kebab-case kit files (`button.tsx`) become `Button/Button.tsx`, which is what `units:fold` already does (`plan/targets.ts`: `HOMES.fold` = `dir/name`).
- **Hook naming.** The file is `use-<kebab(Name)>.ts` and exports `use<Name>`.
  - The guard compares the two ignoring hyphens and case, so `use-whatsapp-sign-in.ts` matches `useWhatsAppSignIn`.
  - A hook is never a `.tsx` file and never `Name.hooks.ts`: `HOOK_FILES` in `packages/config/eslint-react.js` covers only `**/use-*.ts(x)`.
  - The hook's types go in `Name.types.ts`. That keeps `use-name.ts` plus one test at 2 files, below `FOLD_MIN = 3` (`tools/scripts/units/scan/floating.ts`), so `guard:units` does not change.
- **Existing same-name hooks.** About 42 components already call a `use<OwnName>`, for example MyPaymentAmount, QuoteSheet, ReopenBar, RuleRow, DeviceCheck and CodeSignIn.
  - When the component and its tests are the hook's only importers, the hook is adopted: it moves into `Name/` with `git mv`, and the rest of `S` is merged into it.
  - Extra exports split out to a purpose-named file in the same folder: `useQuoteSend` leaves `use-quote-sheet.ts` for `use-quote-send.ts`.
  - An adopted hook keeps its own parameters, up to 3, so `useReportEntryV2(report, program, opened)` stays as it is.
  - When other code also imports the hook, it is first renamed to its purpose (for example `useMyMonthData`) in its own commit.
  - Adoption is refused when the hook calls `apiFetch` / `apiSend` (about 32 single-importer hooks) or a raw effect (about 81), because the lint tightenings in §3 would flag it inside `Name/`.
    - Such a hook stays where it is, and the generated `use-name.ts` calls it.
    - The component waits for hand work (client-core `queryOptions`, or a docs/57 §5.2 fix) only when the names clash, that is, when the hook is the same-name `use<Name>`.
- **Other single-importer hooks** move into `Name/` under their own names. When one of the same refusals applies, the hook stays put and the local hook calls it.
  - Shared hooks always stay put: `use-sales-unread`, `use-family-codes`, `use-open-file`, and web-kit's controller hooks whose `ReturnType` is a sibling's props.
- **Hook return shape.** The hook returns one object literal holding exactly the names the guards and JSX read. `Name.tsx` destructures it under the same names, so the JSX text does not change.
  - Ref names end in `Ref`, and refs are never read during render.
  - When `Name.tsx` must narrow a type after a guard, the hook returns a discriminated `state`.
- **Props into the hook.**
  - When the component's parameter is a plain identifier, the generated hook takes `props`.
  - Otherwise it takes `{ a, b }`, typed `Pick<NameProps, non-defaulted keys> & Required<Pick<NameProps, defaulted keys>>`.
    - Defaults stay in the component's own pattern, so the values arrive already resolved, and `side: CodesSide` typechecks.
    - Renamed bindings are passed by key (`useName({ tz: savedTz })`), and the rename is copied into the hook's own pattern.
  - The return type is inferred. web-kit and mobile-kit emit no declarations, and nothing outside `Name/` uses `ReturnType<typeof useName>`.
- **Generics, forwardRef, memo, render props.**
  - Type parameters are copied to the hook.
  - A forwardRef with statements is hand work in the R12 lane, where `ref` becomes a prop. Example: web-kit `button.tsx`, with `const Comp = asChild ? Slot : 'button'`.
  - `memo()` is removed by hand.
  - Render-prop callbacks return JSX only. Logic that depends on a callback's arguments moves into a child component with its own hook.
- **Tests and rule 14.**
  - Tests go in `Name/tests/` when there are 2+, otherwise beside the component.
  - An extracted hook is covered through its component's test. A `tests/use-name.test.ts` (with `renderHook`) is added only for branches the component test does not reach, and is written red-first for new behaviour.
  - Rule 14's coverage job and Stryker are not in `.github/workflows` yet. CLAUDE.md says review holds new code to the rule until its check exists, so every new `use-name.ts` counts as a changed logic file.
  - Q2's default is docs/59 §3 class B as written: tests cover the code before the move.
    - «Covered» means every line of `S` runs in the workspace's unit tests on base.
    - The routine measures it with a coverage run in its cloud session (`vitest --coverage` / `jest --coverage`).
    - §8's «rendered by a test» column (some test file contains `<Name`) is only a rough stand-in.
  - Each bundle's PR body lists «behaviour → test», the coverage of each new hook (measured in the cloud session), and the hooks that hold money, schedule or status logic, for the Stryker lane.

## 3. Guard: `guard:components` (no stored file)

**Where it lives.**
- Code: `tools/scripts/ci-checks/components/` (`run.mjs`, `check.mjs`, `body.mjs`, `resolve.mjs`, `tests/*.test.mjs`), run by a `guard:components` script in the root `package.json`.
- CI: a step in the `ci.yml` guards job, after `pnpm guard:move-only`. The guards job is in `REQUIRED = ['check', 'guards']` (`tools/scripts/automerge/checks.ts`).
- It reuses:
  - `tools/scripts/ci-checks/comment-only/args.mjs`, `git.mjs` (base commit, changes, `readAt`) and `source.mjs` (TypeScript parse).
  - `tools/scripts/ci-checks/lint/baselines/renames.mjs` (`gitRenames`, `mover`), plus `tools/scripts/units/move-only/pairs.mjs`. `pairs.mjs` pairs deletes and adds whose content matches once import specifiers are masked, so a small component whose `./` import changed still maps to its base path.
  - `tools/scripts/units/move-only/barrel.mjs` (checks that an index only re-exports).

**What counts as a component.** In the 6 frontend workspaces, any non-test `.tsx` file with a top-level PascalCase function or const that returns JSX, whatever the file's name. This catches lowercase files such as `table-toolbar/fields.tsx` and `thread/hooks/thread-mode.tsx`.

**Checks per component** (in rule-16 order):

1. `Name.tsx` sits in a folder named `Name/`, next to an `index.ts`.
2. `index.ts` only re-exports, and exports no `use*`.
3. The `.tsx` holds one component. It has no other top-level declarations or exports besides `Name` and `Name.displayName = …`.
4. The `.tsx` holds no `interface` or `type`. Props come from `./Name.types`, which may alias a package type (`export type DayCellProps = CellRendererProps<DayRow>`).
5. The body follows the grammar and the JSX-arrow rules in §1:
   - Hook calls are limited to `useTheme` and `use<Name>`.
   - With `use<Name>`, no other statement is allowed.
   - Without it, only `const`s with no function literal and no hook call are allowed.
6. `use-<name>.ts` exists exactly when `Name.tsx` calls `use<Name>`; the names are compared ignoring hyphens and case. It exports only `use<Name>` and calls at least one hook.
7. Across the whole tree, every `use-*.ts` inside a PascalCase folder is imported only from inside that folder.
   - Imports are resolved for `./`, `@/` (root `tsconfig.base.json` `${configDir}/src/*`) and `@ab/*-kit` `exports`.
   - No such files exist today, so nothing has to be grandfathered.
8. A folder with 2+ test files keeps them in `tests/`.
9. Route files:
   - A `src/routes/**` file holds router config plus at most one adapter that calls only `Route.use*` / `getRouteApi` and returns one element.
   - An `app/**` file is a re-export, or one component returning one element, plus `ErrorBoundary`.

**Lint tightenings in PR0** (lint rules, not guard checks). These files survive #937: `packages/config/eslint-react.js` and `lint-web.js` are kept, and each workspace's `oxlint.config.ts` reads its lint blocks.
- The `apiFetch` / `apiSend` ban (`forbiddenImports`) also covers `src/**/[A-Z]*/use-*.ts`. Today it covers only `.tsx`, in `packages/config/lint-web.js`, `apps/staff-mobile/lint.blocks.mjs`, `packages/mobile-kit/lint.blocks.mjs` and `apps/family-mobile/lint.blocks.mjs`.
- The raw-effect block in `reactRestrictions` (`packages/config/eslint-react.js`) stops ignoring `src/**/[A-Z]*/use-*.ts`; today it ignores all of `HOOK_FILES`.
- No file matches that glob today, so each rule already passes on the day it turns on (docs/59 §1). Both changes tighten rules, so `guard:loosened` stays silent.

**Phases** (no baseline file):
- **A, on PRs** (`GUARD_BASE` = merge-base). A component that fails a check at head fails the PR when either:
  - (a) it is new: no base path maps to it through `mover` and `pairs`; or
  - (b) its base version passed every check.

  An old offender that is only edited or renamed passes, which covers folds, comment PRs and feature PRs. About 7 components pass every check today (§8), so phase A blocks only new components and regressions.
- **B, on develop pushes.** The guard prints a `::notice::` with offender counts per workspace and per check, and exits 0.
- **C, per workspace, inside its bundle PR.**
  - Phase A cannot tell whether a bundle finished: every component the bundle converts was an old offender at base, so it passes either way.
  - Each bundle therefore ends with `guard:components -- --whole <ws>` at zero offenders, and adds the workspace to the guard's `STRICT` list in the same PR.
  - `STRICT` is code, not a baseline: it names finished workspaces, never offenders, and it only grows.
  - In a `STRICT` workspace any offender fails, as with `guard:escapes`. After PR 7, all six workspaces are strict.
  - The native oxlint rules `react/no-multi-comp` and `only-export-components` stay off. The guard is the single check, and it already exempts `*-icons.tsx`.

**Enforcement on hand merges.** The guard blocks lane auto-merge through the `guards` job, and hand merges follow the completed-checks rule.

**The guard's own tests** (`node --test`, in the «test others» row), each against a fixture tree:
- One compliant folder.
- One failing fixture per check 1–9.
- Passing cases: a render prop, `renderItem`, `.map`, `void call()`, an accessor, and a handler with an object argument.
- Failing cases: a two-call arrow, a ternary handler, `filter` in JSX, a JSX const, and a hookless `use-name.ts`.
- An `index.ts` that re-exports a hook.
- A lowercase `fields.tsx` detected as a component.
- A route adapter that passes, and route logic that fails.
- A showcase and a test helper, both exempt.
- A 6-line component whose only import is rewritten still passes when folded (via `pairs`).
- An added offender fails, a regressed one fails, and an old offender in a `STRICT` workspace fails.
- `--whole <ws>` counts every offender in the workspace.
- No base (a push): notice and exit 0.

## 4. Codemod

There are two entry points. Both plan before they apply: a scan decides every step's verdict for every component before anything is written, and a component refused at any step is left untouched by every step.
- **Fold:** `pnpm units:fold -- --components`, using a new `tools/scripts/units/scan/components.ts` beside `scan/floating.ts`. For components the minimum unit size is 1 file. `guardedUnits` is unchanged.
- **Everything else:** `pnpm components -- --dry-run|--write --step <types|helpers|split|hook|adopt|all> --paths <dirs> --exclude <file> [--json]`, in `tools/scripts/components/`.

It reuses:
- `tools/scripts/units/write/{apply,rewrite,barrel,lone-barrel,json-paths}.ts`
- `tools/scripts/units/plan/{cap,refs}.ts`
- `tools/scripts/ci-checks/move-module/specifiers.ts` (covers `vi.mock` / `jest.mock`, `require` and `import()`), plus ts-morph `newProject`

oxfmt formats every touched file.

### Phase 1: fold (`move/*` PRs, proved by `guard:move-only`)

- **Unit.** The component `.tsx` together with its `Name.*.test.tsx`, `Name.types.ts` and `Name.showcase.tsx`.
  - Multi-component files fold whole.
  - Kebab-case kit files fold with a case rename.
- **Excluded trees.** As in `scan/tree.ts`.
- **Barrel.** `export { Name }` plus the names that outside code imports (the used-names logic in `rewrite.ts`), never a hook.
- **Kits.** Each folded folder that apps import by deep path gets an `exports` entry in the kit's `package.json`. PR0 teaches `tools/scripts/units/move-only/entries.mjs` to accept an `exports` entry that points at an added export-only `index.ts`, with a test.
- **Skips** (cap, path reference, open PR) are listed for regrouping by hand. Known cap overflows: settings/values 21, short-links/detail 17, inbox/composer 16, web-kit portal/recordings 19, family-web features/children 14.

### Phase 2: in place, inside the bundle

- **Step 2, types.** Every `interface` and `type` in `Name.tsx` moves to `Name.types.ts`.
  - A `type X = {…}` object literal is rewritten as `interface X {…}` (class A, `consistent-type-definitions`).
  - An anonymous parameter literal becomes `NameProps`.
  - A props type imported from a package becomes `export type NameProps = …`.
  - `index.ts` exports a type only when outside code imports it.
- **Step 3, helpers.** Top-level declarations move by dependency closure:
  - Anything `Name.tsx` still reads (JSX, guards, parameter defaults such as `allow = ALL`) goes to `<kebab>.helpers.ts`. `StyleSheet.create` goes to `.style.ts` and `cva` to `.variants.ts`.
  - Values that only `S` reads go into `use-name.ts`, unexported.
  - A hook exported from a `.tsx` goes to its own `use-<purpose>.ts`, never to helpers. Examples: web-kit `CodesGate.tsx` `useCodesOpen`; staff-web `SeriesCheck.tsx` `useSeriesCheck` and `useCourseClean`, and `BubbleActions.tsx` `useBubbleOffers`; staff-mobile `ThreadRow.tsx` `useThreadRow`.
  - If that hook's code carries a suppression entry (ThreadRow's `useCallback`), the component is refused.
  - Test imports of moved helpers are rewritten.
- **Step 4, split.** An extra component moves to `Name/Sub/Sub.tsx` only when Sub will pass the guard: it has no statements, or step 5 succeeds for it.
  - The split is refused when the parent would pass 12 sub-folders, when the file exports 2+ components, or when Sub closes over a binding local to the parent.
- **Step 5, hook.** For component F, and only when F calls a hook other than `useTheme`:
  1. Split the body into `S` (statements before the first top-level return), `G` (the guards after it) and `R` (the final return).
     - A non-guard statement after a guard is refused as «narrowing after guard».
  2. Hoist hook calls found in `G` or `R` (`can={usePermissions()}`) into `const`s after `S`, in source order.
     - Refused when the call sits in a branch, a callback or a `.map`, or in `R` while guards exist.
  3. Outputs are the names from `S` and the hoists that `G` or `R` read. The hook returns them, and `Name.tsx` destructures them under the same names.
  4. Inputs follow §2 (Pick / Required, defaults already resolved, renames passed by key). Refused when `S` reads a rest element.
  5. Type parameters are copied.
  6. Imports used only by `S` move to the hook. Shared imports are duplicated, and unused ones are dropped.
  7. Refs not named `*Ref` are renamed throughout the file. Refused when JSX reads `.current` or an inline arrow assigns it (MessageLog, Waveform).
  8. Refused when an inline arrow in `R` breaks the §1 rules.
  9. Also refused:
     - a JSX const in `S`
     - a hook defined in the file
     - `memo` / `useMemo` / `useCallback`
     - forwardRef with statements
     - a raw `useEffect` / `useLayoutEffect` in `S`
     - `apiFetch` / `apiSend`
     - an untested component (Q2: its test commit comes first)
     - a hook body token-identical to one in another app (jscpd cross-app); it moves to client-core by hand
  10. Write `use-<kebab>.ts` as `export function useName(arg) { S; hoists; return {…}; }`. Setstate-during-render blocks move in order and unconditionally.
- **Step 6, adopt.** As described in §2: adopt and merge same-name hooks, rename first when the hook is shared, and refuse hooks that call `apiFetch` or a raw effect.
- **Class A on moved text.** After writing, the codemod runs oxfmt and `oxlint --fix`, limited to class-A rules (`consistent-type-definitions`, `consistent-type-imports`, `dot-notation`, unnecessary assertion), on the files it created. Otherwise moved code would carry a class-A entry to a new path: `guard:lint` rejects «a file or rule entry the base lacks», and `prune` cannot add one.

**Cloud verification loop.** It never resets with `git checkout`:
1. Resolve the folders of open PRs once, before this PR exists. `readOpenPrs` in `plan/open-prs.ts` does not filter out the routine's own PR.
2. Write those folders to the exclude file.
3. In a fresh worktree at the merge-base, run `components --write --exclude <file>`.
4. For the workspace, run:
   - `lint:oxfull`, failing on any suppression key the base lacks. Refusals are decided by linting the output, not by reading the suppressions JSON.
   - typecheck and unit tests
   - `guard:components` with `GUARD_BASE`
   - `guard:dup` (jscpd plus `jscpd-gate.mjs`)
   - `guard:knip`
   - `folder-cap.mjs --strict`
5. A failure that points at a file adds that file's component to the exclude file, with the reason. Failures that point at no file (clone totals, a test) are found by halving the candidate set.
6. Repeat from step 3 until everything is green.

The committed codemod commit is therefore always the output of one run with one exclude list, and that list goes in the PR body under «Excluded».

**Idempotence.** Each step skips work that is already done. The fixture tests run `--write` twice and assert that the second run changes nothing. Output is sorted and formatted.

**Dry-run output.** One TSV line per component: `path, step, result (folded|typed|helpers|split|hooked|adopted|no-hook|refused), reason`. Then totals per workspace by result and by reason. `--json` gives the same data for the routine.

**Codemod tests** (red first, in PR0), one fixture per shape:
- guards; generics; a provider; a render prop
- hoist order for hooks called in JSX; ref rename
- defaulted and renamed props (CodesGate, AvailabilityGrid)
- same-name adopt (MyPaymentAmount); adopt with an extra export (QuoteSheet); rename first
- a hook exported from a `.tsx` (CodesGate); a package props alias (DayCell); `displayName` (button)
- every refusal reason; a kebab-case kit file; a package `exports` entry
- mock-string rewrite; idempotence

## 5. Rollout

Eight PRs go to develop. A cloud session builds each one, and nothing runs on the owner's PC. Each row starts when the previous one merges. `move/*` PRs auto-merge when green; the owner merges the others once every check has completed.

| # | Branch / title (rule 25) | Content | Est. files |
|---|---|---|---|
| 0 | `ci/component-folders` / `ci(repo): check component folders and local hooks` | Rule 16 text, docs/57 §2.12, `guard:components` and its tests, the two lint tightenings, the `--components` scan, the codemod and its fixtures, `exports` acceptance in `entries.mjs`, the route-tree diff step, report-only `ui-screens` compare | ~60 |
| 1 | `move/components-family-kits` / `refactor(repo): fold family and kit components into folders` | Phase 1 for family-web, family-mobile, web-kit and mobile-kit (~520 component files), plus the apps' import rewrites | ~1,800–2,200 |
| 2 | `bundle/components-family` / `refactor(repo): move family component logic into local hooks` | Pilot. Tests-first commits, then the codemod commit, then hand commits. Ends at zero offenders, and family-web and family-mobile become `STRICT`. Family has no suppressions file | ~400 |
| 3 | `bundle/components-kits` / `refactor(repo): move kit component logic into local hooks` | Same, for web-kit and mobile-kit, plus regrouping of over-cap folders. Both kits then become `STRICT` | ~900 |
| 4 | `move/components-staff-mobile` / `refactor(staff-mobile): fold components into folders` | Pure fold (~750 files). No `app/` changes | ~2,300 |
| 5 | `bundle/components-staff-mobile` / `refactor(staff-mobile): move component logic into local hooks` | Tests first, codemod, hand work, and the 11 `app/` route extractions. Then `STRICT` | ~2,000 |
| 6 | `move/components-staff-web` / `refactor(staff-web): fold components into folders` | Pure fold (~1,070 component files, ~635 sibling tests) | ~3,000+ |
| 7 | `bundle/components-staff-web` / `refactor(staff-web): move component logic into local hooks` | Same as row 5, plus the 9 route files. Then `STRICT`, which makes the whole repo strict | ~2,800 |

**How a bundle is built.**
- Each domain gets a sub-branch (`bundle/components-<ws>-<domain>`), opened as a ready (not draft) PR into the bundle branch. `ci.yml`'s e2e job skips draft PRs, and its `pull_request` trigger has no branch filter, so CI proves each domain on its own.
- Each sub-branch's commits run in order: «tests» → «codemod run» → «hand fixes».
- The routine pushes the tests commit first and waits for green, so class B's «tests pass before the change» shows in the check history.
- The main session merges green sub-PRs into the bundle. Develop sees one PR per workspace.

**Why folds are separate PRs.** A fold must be pure to pass `guard:move-only` and to keep the lint gate's `-M50%` rename carry (`renames.mjs`). Extracting the hook drops `Name.tsx` below 50% similarity.

PR 6 may exceed the 3,000 files GitHub's file list shows. `guard:move-only` is the proof, not the UI; if the owner wants the full list readable, the PR splits into two halves by `features/<domain>`.

**Order:**
- Family first: it is the smallest, has no suppressions, and pilots both the web and mobile paths.
- Kits next: their folds rewrite the apps' import lines once, before the apps are swept.
- staff-mobile next: mobile-only diffs skip e2e.
- staff-web last: it is the largest and has the most suppressions.

**Sequencing against in-flight work:**
1. #937 `build/oxlint-only` merges first (mergeable, clean). It changes the lint config that PR0's tightenings and the loop's `lint:oxfull` read.
2. #928 is independent (15 files).
3. `nest/all-modules` touches only the api, so it cannot collide.
4. Comment lane: #962 and #963 are merged. The `chore/comments-<ws>-N` lane pauses for a workspace while that workspace's fold or bundle is open.
5. In each workspace, the docs/59 §4 class-A lanes (format, autofix) wait until its bundle merges. The bundle applies class A fixes only to the text it moves.
6. In-flight work is found with `gh pr list` (open PRs), never with `git rev-list develop..branch`, because squash merges inflate ahead counts.
7. A codemod commit is never conflict-resolved by hand. On drift, the routine regenerates it from fresh develop with the recorded exclude list.

**Verification per PR:**
- **All PRs:**
  - the `check` rows: lint + parity, typecheck + bundles, test web 1–4/4, test api 1–4/4, test mobile 1–2/2, others
  - the `guards` job: `guard:components`, `guard:lint` with no new key, `guard:units`, `guard:knip`, `guard:dup` (including cross-app clones), `guard:baselines`
  - the `refactor` job: `folder-cap.mjs --strict`
  - e2e whenever the diff calls for it
- **Route snapshot.** Both web apps' `typecheck` script runs `tsr generate && tsgo --noEmit`, which regenerates the route tree. PR0 therefore adds `git diff --exit-code apps/*/src/routeTree.gen.ts` after the typecheck row. PR0's own CI either proves the step green on day one or regenerates the committed tree. No file under `apps/*/app/` is added, deleted or renamed outside PR 5.
- **`move/*` PRs:** `guard:move-only`, and full e2e for web.
- **Web bundles, visual no-change.** `ui-screens.yml` gets a `workflow_dispatch` input `base_ref`. It shoots base and head, uses soft assertions, lists the pages above `maxDiffPixelRatio` 0.002 in `$GITHUB_STEP_SUMMARY`, and exits 0.
  - The routine dispatches it only on bundle PRs, never on `move/*` lane PRs. A dispatched run's checks attach to the head commit, and `automerge/checks.ts` holds back a PR while such a check is pending or red.
  - It is a report, not a proof. Server-decided «now» (rule 22) and `seed:demo` data make pixels differ between runs.
- **Mobile:** test mobile 1/2 and 2/2, and the Metro bundle in typecheck + bundles. No `mobile.yml` build or OTA is triggered.

**CI cost** (from the #954 and #962 timings):

| PR type | Runner-min |
|---|---|
| Fixed per PR (~15 verify rows, guards, refactor) | ~90 |
| Web e2e | ~80–100 |
| Screenshot compare | ~60 |
| Web PR | ~230 |
| Mobile-only PR | ~100 |

The 8 PRs to develop come to about 1,300–1,500 runner-min. Each domain sub-PR adds about 100–230 runner-min, so about 25 sub-PRs add another 2,500–5,500, plus reruns.

## 6. Risks and mitigations

- **Suppression entries are keyed by path.**
  - Folds are pure renames, so their entries carry over.
  - Moved text gets the class-A autofix.
  - Anything that still produces a new key is excluded by the loop, which lints the output.
  - Raw effects are refused rather than legalised, so lane X keeps its `ab/no-restricted-syntax` inventory.
- **The complexity limit is 6 in `.ts` against 8 in `.tsx`.** The loop excludes components that fail it. They are split by hand into `use-<purpose>.ts` files along real purposes, never into meaningless pieces (docs/59 §5).
- **React Compiler.**
  - A hook exists only where a hook is called, so every `use-name.ts` is compiled.
  - Refs end in `Ref` and are never read in render.
  - `memo`, `useMemo` and `useCallback` are refused.
  - No test detects a compiler bail-out, so e2e and the screenshot report are the safety net.
- **Rules of hooks and type narrowing.** Guards stay in `Name.tsx`, «narrowing after guard» is refused, and the hand fix is a discriminated `state` returned by the hook.
- **Hiding rule 19 and rule 21 violations.** From PR0, lint bans `apiFetch` and raw effects in local hooks, and the codemod and the adopt step refuse them.
- **Mock strings.** `specifiers.ts` rewrites `vi.mock` and `jest.mock`. The loop fails when a mock specifier no longer resolves, because a stale mock silently stops mocking.
- **jscpd clones between dialog hooks.** The loop finds and excludes them. A clone pair moves to client-core `queryOptions` or a shared dialog hook, which rule 19 wants anyway.
- **Folder cap.** Sub-components nest inside their parent. Known overflows are regrouped by hand under `--strict`, with no baseline.
- **Branch drift.** Regenerate rather than merge, and keep at most 2–3 sub-PRs open at once per bundle (docs/57 §10.1).
- **Volume of test writing (Q2).** About 910 components that need a hook have no test that renders them. Routines write those tests first, in the domain sub-branches.

## 7. Open questions for the owner

1. **May `Name.tsx` keep `useTheme()`, and may a component with no hook keep value-only consts instead of getting a hook?**
   - Recommended default: yes. Reading the theme is not logic, and the compiler does not compile a `use*` function that calls no hook (infer mode), so forcing one costs memoization.
   - Logic in function literals still leaves `Name.tsx`, for a pure `.helpers.ts`.
   - The literal reading would add about 1,000 hook files: components whose only content is `useTheme` and/or statements with no hook (§8 scan: staff-web 358, staff-mobile 364, mobile-kit 126, web-kit 82, family 73). It would also lose compiler memoization on the hookless ones.
2. **Must every component the codemod touches be covered by a test before the move (docs/59 §3 class B, rule 14)?**
   - Recommended default: yes.
   - Mechanical components already rendered by some test (a rough stand-in; the routine measures real coverage): staff-web 178 of 433, staff-mobile 121 of 328, web-kit 25 of 67, mobile-kit 16 of 46, family 25 of 76. The rest get a test first.
   - Answering «no» lets the codemod run on every mechanical component, proved by a byte-for-byte replay job (with its inputs recorded in the PR) plus typecheck, the existing tests and e2e. That is faster, but it adds hooks with no coverage, against rule 14.
3. **May icon sets stay one file?** These are `*-icons.tsx` files holding only pure SVG components, e.g. staff-mobile `chat-icons.tsx` (14 icons) and mobile-kit `room-icons.tsx`.
   - Recommended default: yes. One folder per icon would push mobile-kit `src/room/live` to 17 sub-folders and adds nothing.
   - The guard exempts these files, and the native `no-multi-comp` rule stays off.

## 8. Numbers

This is a regex scan of `83066331f` (perl with brace matching), so every figure is an estimate. A component is a top-level PascalCase function or const containing JSX, outside routes, `app/`, tests and showcases. «Need a hook» means it calls a hook other than `useTheme`. «Mechanical» means the scan saw no refusal shape. That is an upper bound: the scan cannot see suppressions, the complexity limit of 6, clones or renamed props.

| Workspace | Components (files, multi-comp files) | Already compliant | No hook (with fn-literal logic) | Need a hook | Mechanical ceiling | Mechanical + rendered by a test | Planned PRs |
|---|---|---|---|---|---|---|---|
| staff-web | 1,434 (1,138, 202) | 0 | 645 (86) | 789 | 433 (55 %) | 178 | 6, 7 |
| family-web | 74 (56, 14) | 0 | 44 (4) | 30 | 25 (83 %) | 10 | 1, 2 |
| staff-mobile | 1,028 (842, 126) | 3 | 474 (71) | 554 | 328 (59 %) | 121 | 4, 5 |
| family-mobile | 124 (101, 20) | 0 | 56 (3) | 68 | 51 (75 %) | 15 | 1, 2 |
| web-kit | 263 (200, 45) | 2 | 163 (16) | 100 | 67 (67 %) | 25 | 1, 3 |
| mobile-kit | 243 (192, 27) | 2 | 174 (14) | 69 | 46 (67 %) | 16 | 1, 3 |

Refusal shapes among the components that need a hook (one component can have several):

| Workspace | Inline arrow | Narrowing after guard | JSX const | memo/useMemo/useCallback | Raw effect | `.current` in JSX | Hook defined in file | `apiFetch` | Same-name hook |
|---|---|---|---|---|---|---|---|---|---|
| staff-web | 143 | 104 | 71 | 33 | 29 | 22 | 15 | 13 | 14 |
| staff-mobile | 80 | 76 | 40 | 32 | 11 | 7 | 14 | 22 | 17 |
| family | 7 | 7 | 3 | 0 | 0 | 0 | 4 | 0 | 3 |
| web-kit | 12 | 9 | 3 | 0 | 5 | 3 | 4 | 0 | 2 |
| mobile-kit | 4 | 4 | 4 | 1 | 3 | 2 | 4 | 0 | 6 |

Other counts:
- About 211 `Name/Name.tsx` folders exist today. None holds a `use-*.ts`.
- Route files whose components call hooks other than `Route.use*`: staff-web 9 of 90, family-web 0 of 18, staff-mobile `app/` 11 of 181, family-mobile `app/` 0 of 18.
