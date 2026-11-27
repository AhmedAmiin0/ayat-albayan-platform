# Contracts builders: how several builders share one base

The contracts work of docs/62-api-contracts.md (routes, schemas and types defined once in packages) is moved by several builders at once. This file is the working agreement between them. A builder reads it at the start of every run from the base it works on; where it differs from a builder's own instructions about branches, sub-PRs or merging, this file wins.

## Bases and areas

A base is a branch that collects the work of several builders and lands on develop as one PR. Nobody but the base's keeper commits to a base directly: a builder works on its own sub-branch, cut from the base, and merges its finished sub-PR into the base.

| Base | Lands as | Keeper |
|---|---|---|
| `lane/contracts-finance-schedule-people` | docs/62 C1 | builder 1 |
| `lane/contracts-messaging-sales-teaching` | docs/62 C2 | builder 4 until C1 is on develop, then builder 1 |

| Builder | Area | API modules (`apps/api/src/modules/…`) | Base | Sub-branch |
|---|---|---|---|---|
| 1 | finance | `finance/*` | C1 | `lane/contracts-finance` |
| 2 | people | `people/*` | C1 | `lane/contracts-people` |
| 3 | booking | `teaching/booking`, `teaching/scheduling`, `teaching/schedule-notices`, `teaching/course-pause`, `teaching/course-stop` | C1 | `lane/contracts-booking` |
| 4 | messaging | `messaging/*` | C2 | `lane/contracts-messaging` |
| 5 | teaching | `teaching/*` except builder 3's five modules | C2 | `lane/contracts-teaching` |
| 6 | sales | `sales/*` | C2 | `lane/contracts-sales` |
| 7 | reporting and platform | `reporting/*`, `platform/*` | C2 | `lane/contracts-reporting` |

Every API module has a builder. A builder whose own area has no handler left on plain decorators takes the area with the most handlers still on plain decorators that no other builder is working on (no open sub-PR and no sub-branch of another builder touches it), on a new sub-branch `lane/contracts-<area>` of the C2 base, and says so in its summary.

An area is its API modules, their schemas and routes in packages, and the client-core endpoint files and app hooks that call them. A builder never changes a route, schema, controller, endpoint file or hook of another area. In a file two areas share (a package index, a snapshot, a suppressions file) it changes only its own lines. When a route group needs a schema another area owns, it imports it; if that schema does not exist yet, the group waits and the builder names it in its summary.

## One run

1. **Claim.** Only your own sub-branch and its `wip/` copy count. If either has a newest commit under 55 minutes old whose message lacks the trailer line `Run-State: done`, another run of yours is working: exit. A live run pushes at least every 45 minutes, so an older commit without the trailer is a run that stopped early: pick its work up (its `wip/` copies first) and go on. Commits by other builders never stop you.
2. **Your open sub-PR is red.** A known flake on attempt 1 is rerun once (`gh run rerun <run> --failed`); anything else is found at its root and fixed. No test is weakened, skipped or deleted.
3. **Your open sub-PR is green: merge it now, in this run.** Do not wait for another CI round and do not require your branch to contain the base's head:
   - `git fetch origin`, check out the base at its newest head, `git merge --no-ff origin/<your sub-branch>`;
   - a conflict in a generated file is never resolved by hand, see «Generated files»; a conflict anywhere else is between two areas' lines in a shared file: keep both;
   - verify the merge in the session: `pnpm i`, the typecheck of every workspace the merge touched, `pnpm lint:oxfull`, the api route-map tests, and the unit tests of the folders your sub-PR changed;
   - commit and push the base. When the push is refused another builder merged first: start again from the fetch;
   - check that GitHub shows the sub-PR as merged; if it does not, close it with a comment that names the merge commit.
4. **Build the next part** from the base's newest head on your sub-branch (unfinished output only on its `wip/` copy): as many route groups of your area as fit one run (about 50 minutes) and one review (about 60 files). Open the sub-PR with the base as its base branch, ready, titled `refactor(contracts): <area> routes and schemas in packages (part <n>)`. One open sub-PR per builder.
5. **Your sub-PR is open and its checks are still running:** do not wait. Start the part after it on `wip/<your sub-branch>-next`, cut from your sub-branch; it becomes your sub-branch's next part once the open one is merged.

The last commit a run pushes ends with the trailer line `Run-State: done`. Work in progress is pushed at least every 45 minutes.

## Generated files

- `apps/api/src/route-map/contracts.snap.json` is written by its own test: in `apps/api`, `npx vitest run src/route-map/contracts.test.ts -u`. After a merge it differs from the previous base only by the routes the merged work moved.
- `apps/api/src/route-map/routes.snap.txt` never changes: moving a route to a route object changes no wire.
- Every `oxlint-suppressions.json` is brought in line by `pnpm lint:prune`. An entry may only fall; none is added or edited by hand.

## Keeping a base healthy

Merges into a base are verified in the session, not by a CI run, so the keeper checks the whole base regularly:

- At the start of each run the keeper looks at the newest `ci` run started by hand on the base (`workflow_dispatch`). If the base's head is newer than that run's commit and no such run is queued or in progress, it starts one: `gh workflow run ci.yml --ref <base>`.
- If the newest finished one is red, fixing the base comes before the keeper's own area: find the root cause, fix it on the keeper's sub-branch, merge it as above.
- The C2 base was cut from the C1 base. The keeper of the C2 base merges nothing else into it until C1 is on develop; after that it merges develop once and regenerates.

## How a route group is done

docs/62 is the spec and the base's own history is the example: a test that pins the routes and the client calls before they exist; then the routes and schemas moved into packages, the controller on `@Route` and `@RouteInput()`, read-route mappers through `asResponse`, the client on `call({ route, … })`; then the lint entries the move freed, pruned. Wire changes are only the rows of docs/62 part 1 §6 marked for the PR the base lands as; anything else is left out and listed in the sub-PR body under «Needs a new go». No new code uses `apiFetch`, `apiSend`, `publicApiFetch` or `publicApiSend` (docs/62 part 3 §3b).

## The shared package's top level is full

`packages/shared/src` holds 13 folders, the most its folder cap allows (`refactor/folder-cap/packages.json`). A fourteenth fails the `refactor` check and costs the sub-PR a run. Put an area's schemas and routes inside the top-level folder that already owns it:

| Area | Folder in `packages/shared/src` |
|---|---|
| finance | `finance/` |
| people | `people/` |
| booking, scheduling, lessons, classroom, course pause and stop | `schedule/` |
| feedback, recordings, lesson files, lesson reports | `reports/` |
| messaging, student channels | `messaging/` |
| notification rules and push | `notifications/` |
| sales | `sales/` |
| platform (settings, translations, google sync, short links) | `settings/`; what is already in `schemas/` stays there |

A new sub-folder inside one of these is fine, within the same cap of 12 code files and 12 sub-folders. Before each push run `node tools/scripts/ci-checks/folder-cap.mjs --strict` in the session, beside the other checks.

## Call files stay plain

A call file (`x-api.ts` in client-core) is read by people who did not write it. Keep it a flat list.

- One line per route: `name: (args) => call({ route, params, query, body })`. No helper that takes `call` as an argument, no type guard, no ternary that picks between two route tables.
- One call file serves one audience. When the API has two route tables for the same data (a person's own, and a staff view of someone else's), write two small factories, one per table (for example `myEarningCalls(client)` and `teacherEarningCalls(client)`). The hook that knows who is looking picks one.
- No argument whose `undefined` means «me».
- Route tables are imported under their own names, not renamed to `mine`, `admin` or the like.
- `call` is typed with the exported `Call` type, never `ReturnType<typeof callWith>`.
- When a lint limit (function length, complexity) pushes toward a helper, split the file by audience or by route table instead.

A call file already on a base that breaks these lines is put right by the builder of its area in its next part, with its tests; `teacher-earnings-api` (finance) is the first.

## Who opens what

Only the keeper named for it opens a base's PR into develop, and only when no handler of the base's areas is left on plain decorators and no sub-PR into the base is open. No other builder opens a PR into develop, labels a PR or runs `gh pr merge`. When a base's PR into develop is open, its builders stop adding to it.
