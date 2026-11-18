# 52 — Shared types: domain and contract types move from the apps into packages

Owner 2026-11-18: «apps are not allowed to import from each other any shared code should stay in a
shared package» and «move any types classes enums or interfaces to a shared package and use it from
there if it doesn't have its own package; if the interface already lies under a specific package keep
it, if not move it to a shared package». Scope: apps/api, apps/staff-web, apps/staff-mobile,
apps/family-mobile (apps/family-web has its own routine). Branch `types/shared-types` (was
`refactor/shared-types`, PR #767; renamed out of `refactor/*`, see D7), merged with develop after
#766, #768 and #770.

## 0. Rules applied (agreed reading)

- **Move**: domain enums, unions and statuses; API request/response and contract shapes; client
  copies of API shapes; state-machine tables; anything declared in two or more apps.
- **Targets**: `@ab/shared` (or the domain package it re-exports: `@ab/money`, `@ab/catalog`, …)
  for contracts, enums, statuses and state machines; `@ab/client-core` for web + mobile client
  logic; `@ab/web-kit` / `@ab/mobile-kit` for UI-kit types. A type already in a package stays.
- **Keep** in the app: component Props, file-private types, NestJS providers and API-internal
  implementation types (repo rows, ports, job payloads) no other app uses.
- No re-export shims: every app imports the moved name from `@ab/shared`.

## 1. Counts

| | Declarations |
|---|---|
| Exported type / interface / enum / class in the four apps (tests excluded) | 3563 |
| Moved out of the apps by develop #740, #766, #768 (@ab/web-kit, @ab/shared), not counted below | 131 |
| Moved in this PR (package names; app declarations deleted: 113) | 39 |
| Kept in the app (§3) | 3088 |
| Move in a later slice (§4) | 231 |

## 2. Moved in this PR

| Name | Was in (app copies, deleted) | Used by | Decision | Target |
|---|---|---|---|---|
| `DashboardResponse` (was `DashboardData / FinanceSummary`) | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/finance/summary/summary-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-views.ts |
| `MonthFinance` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/finance/summary/summary-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-views.ts |
| `DashboardCounts` (was `Summary`) | staff-mobile/src/ops/dashboard/dashboard-types.ts | mobile | move | @ab/money ledger/dashboard-views.ts |
| `WORK_TABS, WorkTab` | staff-web/src/features/reporting/dashboard/search.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `WorkList` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `WorkStudentRef` (was `StudentRef`) | staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `PendingReportRow` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `UnpaidRow` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `TaskRow` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `DashboardWork` | api/src/modules/reporting/dashboard/dashboard.types.ts<br>staff-web/src/features/reporting/dashboard/types.ts<br>staff-mobile/src/ops/dashboard/dashboard-types.ts | api, web, mobile | move | @ab/money ledger/dashboard-work.ts |
| `LEAD_TRANSITIONS, canTransitionLead, allowedNextStatuses` | api/src/modules/sales/leads/lead-state-machine.ts<br>staff-mobile/src/inbox/leads/detail/allowed-next-statuses.ts | api, mobile | move | @ab/catalog enums/lead-transitions.ts |
| `LeadView` (was `LeadRow / Lead / api LeadView`) | staff-web/src/features/sales/leads/types.ts<br>staff-mobile/src/inbox/shared/types.ts<br>api/src/modules/sales/leads/leads.service.ts | api, web, mobile | move | @ab/shared people/schemas/lead-views.ts |
| `JobApplicantView` (was `JobApplicantRow`) | staff-web/src/features/sales/leads/types.ts | web | move | @ab/shared people/schemas/lead-views.ts |
| `Page` | api/src/common/http/http.ts<br>api/src/modules/people/guardians/http.ts<br>api/src/modules/sales/leads/http.ts<br>staff-web/src/features/finance/subscriptions/api.ts<br>staff-web/src/features/people/students/types.ts<br>staff-web/src/features/people/teachers/api.ts<br>staff-web/src/features/sales/leads/types.ts<br>staff-mobile/src/core/lib/query/paging.ts | api, web, mobile | move | @ab/core schemas/page.ts |
| `StudentRef` | staff-web/src/features/people/students/types.ts<br>staff-mobile/src/students/shared/types.ts | web, mobile | move | @ab/shared people/students/student-views.ts |
| `StudentListItem` | staff-web/src/features/people/students/types.ts<br>staff-mobile/src/students/shared/types.ts | web, mobile | move | @ab/shared people/students/student-views.ts |
| `StudentProfile` | staff-web/src/features/people/students/types.ts<br>staff-mobile/src/students/shared/types.ts | web, mobile | move | @ab/shared people/students/student-views.ts |
| `TeacherOption` | staff-web/src/features/people/students/types.ts<br>staff-mobile/src/students/list/use-student-list-data.ts<br>api/src/modules/people/students/students.repo.ts | api, web, mobile | move | @ab/shared people/students/student-views.ts |
| `DuplicateStudentBody` (was `DuplicateBody`) | staff-web/src/features/people/students/types.ts | web | move | @ab/shared people/students/student-views.ts |
| `Teacher` | staff-web/src/features/people/teachers/api.ts<br>staff-mobile/src/core/lib/staff/types.ts | api, web, mobile | move | @ab/shared people/teachers/teacher-views.ts |
| `TeacherListRow` (was `TeacherListRow / TeacherListItem`) | staff-web/src/features/people/teachers/api.ts<br>staff-mobile/src/core/lib/staff/types.ts | api, web, mobile | move | @ab/shared people/teachers/teacher-views.ts |
| `AvailabilityRow` | staff-web/src/features/people/teachers/api.ts<br>staff-mobile/src/core/lib/staff/types.ts<br>api/src/modules/people/teachers/availability/availability.repo.ts | api, web, mobile | move | @ab/shared people/teachers/teacher-views.ts |
| `TimeOff` | staff-web/src/features/people/teachers/api.ts<br>staff-mobile/src/core/lib/staff/types.ts | web, mobile | move | @ab/shared people/teachers/teacher-views.ts |
| `AssistantRow, LedgerFilter, StatementFilter` | staff-web/src/features/people/assistants/api.ts<br>staff-mobile/src/assistants/api/api.ts | web, mobile | move | @ab/client-core people/assistants/assistant-list.ts |
| `UsersView` | staff-web/src/features/people/users/api.ts<br>staff-mobile/src/users/shared/api.ts | web, mobile | move | @ab/client-core people/users/users-view.ts |
| `FeedbackListRow` | staff-web/src/features/teaching/feedback/types.ts<br>staff-mobile/src/feedback/types.ts | web, mobile | move | @ab/shared schemas/feedback.ts |
| `PeriodTotal, PaymentsPage` | api/src/modules/finance/payments/payments.repo.ts<br>staff-web/src/features/finance/payments/api.ts<br>staff-mobile/src/money/shared/types.ts | api, web, mobile | move | @ab/money ledger/payments/payments-page.ts |
| `SessionFilter, SubscriptionFilter` | staff-web/src/features/finance/teacher-earnings/api.ts<br>staff-mobile/src/earnings/hooks/queries.ts<br>staff-web/src/features/finance/subscriptions/search.ts<br>staff-mobile/src/money/payments/filters.ts | web, mobile | move | @ab/client-core finance/list-filters/list-filters.ts |
| `QuotedPrice` | staff-web/src/features/finance/subscriptions/custom-price/use-custom-price.ts<br>staff-mobile/src/subscribe/custom-price/custom-price.ts | web, mobile | move | @ab/client-core finance/quote-custom/quote-custom.ts |
| `SalesSubscriptionView, SalesSubscriptionKind, SalesPersonView` (was `SalesSubscription / SubscriptionKind / SalesPerson`) | staff-web/src/features/sales/sales/api.ts<br>staff-mobile/src/sales/sales/lib/sales-api.ts | web, mobile | move | @ab/shared sales/views.ts |
| `RegistrationCheckBy, RegistrationCheckCode` (was `CheckBy / CheckErrorCode / CheckSearch`) | staff-web/src/features/sales/sales/registration/registration-check.ts<br>staff-mobile/src/registration-check/lib/registration-check.ts | web, mobile | move | @ab/shared sales/registration.ts |
| `LeadSort (+ parseLeadSort, leadSortValue, leadSortFromValue)` | staff-web/src/features/sales/leads/list/lead-sort.ts<br>staff-mobile/src/inbox/leads/list/lead-sort.ts | web, mobile | move | @ab/client-core sales/lead-sort/ |
| `LessonTimeEditView, LessonView, LessonTimeEdit` (was `TimeEditInfo / EditableLesson / LessonTimeEditBody`) | staff-web/src/features/teaching/schedule/edit-time/edit-time.contract.ts<br>staff-mobile/src/edit-time/lib/types.ts | web, mobile | move | @ab/shared (existing) |
| `ThreadFile` (was `ThreadFile / MediaUrl`) | api/src/modules/messaging/inbox/files/thread-media.service.ts<br>staff-web/src/features/messaging/inbox/api/api.ts<br>staff-mobile/src/inbox/messages/hooks/thread-file.ts | api, web, mobile | move | @ab/shared messaging/chat/chat-files.ts |
| `AudienceTab` | staff-web/src/features/messaging/notification-catalogue/catalogue-tabs.ts<br>staff-mobile/src/ops/notif-rules/lib/audience-tabs.ts | web, mobile | move | @ab/shared notifications/catalogue/catalogue-views.ts |
| `SESSION_GROUPS, SessionGroup` | staff-web/src/features/teaching/classroom/sessions/sessions.ts<br>staff-mobile/src/classroom/sessions/sessions.ts | web, mobile | move | @ab/client-core teaching/lessons/session-groups.ts |
| `StudentRecordingFilters` (was `RecordingFilters`) | staff-web/src/features/people/students/recordings/recordings-api.ts | web | move | @ab/schedule classroom/student-recordings.ts |
| `BookingMode` | staff-web/src/features/teaching/booking/mode.ts<br>staff-mobile/src/booking/shared/booking-mode.tsx | web, mobile | move | @ab/client-core teaching/booking/booking-mode.ts |
| `BookingRequest` (was `BookingBody / BookingExtras / MakeupRequest`) | staff-web/src/features/teaching/booking/draft/contract.ts<br>staff-mobile/src/booking/shared/contract.ts | web, mobile | move | @ab/shared (existing) |

- **reporting / dashboard**: GET /dashboard/summary and /dashboard/work shapes join `DashboardSummary` in `@ab/money` (ledger/dashboard-views.ts, dashboard-work.ts). The api keeps `SourceKey` and `WORK_ITEMS` (module-internal). Mobile's `Summary` and `FinanceSummary` narrowings become `DashboardCounts` (a Pick in the package) and `DashboardResponse`; web's `DayRange` moves into its own `search.ts` (URL state, kept).
- **sales / leads**: The lead funnel table is one source in `@ab/catalog` beside `LeadStatus`; the api test and the mobile drift test merge into its package test. The api's own `LeadView` (a DB row plus the salesperson's name) now returns the package `LeadView`.
- **lists**: `Page<T>` (every list endpoint) was declared eight times; it joins the zod list primitives in `@ab/core`.
- **people / students**: Web and mobile copies of the students module's responses become one set in `@ab/shared` people/students; `FamilyPhone` moves there from sales/family-link.ts. The api keeps its row-built `StudentListItem` / `StudentProfile` (built from `Tables<'students'>` joins; see D6).
- **people / teachers, assistants, users, feedback**: Teacher wire shapes join `@ab/shared` people/teachers (the api controller types its responses with them; the repo keeps its `Tables<>` rows). Test fixtures for them live in `@ab/shared/testing`. List filters that only the clients use go to `@ab/client-core`. Feedback rows join the feedback schemas; web's `FeedbackPage`, `FeedbackSubmitBody` and `Rating` become the existing `Page<FeedbackRowView>`, `FeedbackSubmit` and `FeedbackRating`. Mobile's `FeedbackAverage` is kept: it allows nulls the package type does not.
- **finance and sales**: Payment totals and the payments page join the ledger (`@ab/money` ledger/payments/). Client list filters, the custom-price quote and the lead sort (with its pure parser and test) go to `@ab/client-core`. Sales subscription and registration-check names become the package types and zod outputs that already existed. Kept: `CustomPrice` (each app's hook return), `TransferInput` and `ReceiptChoice` (different shapes, DOM File vs RN uri), mobile `CheckErrorCode` (i18n keys), api `SessionFilter` (the whole query, not the client filter).
- **teaching and messaging**: Edit-time and booking aliases give way to the package names they wrapped (`LessonTimeEditView`, `LessonView`, `LessonTimeEdit`, `BookingRequest`). Kept: `InvoiceDraft` (web file name + preview vs mobile uri), `LessonStatusText` (each app builds its own words), mobile `RecordingFilters` (screen state, not the API query). The session-grouping functions are still copied in web and mobile (only the constant and type moved; the functions need an if-free rewrite first).
- **merge with develop (#766, #768, #770)**: #766 moved `ChannelRef`, `PresenceChat`,
  `WithOnline` and `ConfirmSwitchProps` into `@ab/web-kit` and #768 replaced the api's `SentDetail`
  with `ShortLinkSentDetail` in `@ab/shared` (counted in §1, gone from §4). The 18 names #768 added
  in the apps are kept: component props (`ShortLinksPageProps`, `PeoplePicked`, …), hook returns
  (`LinkFormState`, `Gate`, `GatePhone`, `LinkDates`), route/search state (`LinkSection`,
  `LinkListSearch`, mobile `ListView`), component-local (`StatusKind`, `GateIconName`) and the
  gate test kit (`Call`, `Routes`). #766 and #768 each exported a `canResend` from
  `@ab/client-core`; the short-link gate's one (used only by its test) is now `gateCanResend`.

## 3. Kept in the app

| Reason | api | staff-web | staff-mobile | family-mobile | Examples |
|---|---|---|---|---|---|
| NestJS provider, module or implementation class | 1154 | 0 | 0 | 0 | `AppModule`, `AuditService`, `AuditModule` |
| API-internal: service / planner / rule types of one module | 537 | 0 | 0 | 0 | `AuditEntry`, `PermissionResolver`, `Role` |
| API-internal: repo rows, ports, stores, jobs, settings readers, fakes | 340 | 0 | 0 | 0 | `TokenVerifier`, `FakeQueries`, `PlainRow` |
| Kept after review in this PR (see the §2 notes) | 5 | 0 | 0 | 0 | `StudentListItem`, `StudentProfile`, `SourceKey` |
| Component props | 0 | 423 | 47 | 0 | `ColumnFilterTextProps`, `DataTableProps`, `DataTableHeadProps` |
| Feature-local UI state, hook or search type of one app | 0 | 315 | 160 | 7 | `FilterKind`, `SortDir`, `FilterOption` |
| Component-local type (one component file) | 0 | 62 | 28 | 3 | `DiscardWords`, `RowExtras`, `SettingsView` |
| Error / implementation class | 0 | 2 | 5 | 0 | `ChatUploadError`, `ReplayedSend`, `AvatarUploadError` |

## 4. Move in a later slice (decision: move; not in this PR)

One row per module folder. These are contract or client-copy types the rules above move; this PR
took the duplicated ones first (§2). Each later slice: one domain, same rules, same checks.

| Module folder | Names | Decision | Target |
|---|---|---|---|
| api/src/common/configuration | `OverridesRefresh`, `ConfigRow`, `ConfigSnapshot`, `ConfigChange`, `CustomConfigRow` | API request/response shape | @ab/shared (domain folder) |
| api/src/common/http | `PageQuery` | API request/response shape | @ab/shared (domain folder) |
| api/src/common/infra | `HttpProfile`, `HttpRequest`, `JsonCall`, `BytesCall`, `Http` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/finance | `CommissionRow`, `MyCommissionSource`, `MyStudentSource`, `MyPaymentSource`, `StatementsQuery`, `StatementPay`, `CommissionsQuery`, `StatementRow`, `TermsRow`, `InvoiceSortKey`, `RecentFilter`, `CatalogQuery`, `QuoteQuery`, `SubscriptionQuote`, `SubContext` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/messaging | `CallPermissionFacts`, `PermissionRequest`, `CallsApi`, `PeopleStudentRow`, `FamilyTag`, `ThreadRow`, `SavedReplyRow`, `CrmEndpoint`, `CrmCreated`, `CrmWebhookResult`, `KapsoMessage`, `Contact`, `OutboundRow`, `StatusMove`, `ReplyWindow`, `CrmMessage`, `CrmConversation`, `CrmContact`, `MessageRow`, `ThreadMessageRow`, `MessageViewInput`, `RelayRequest`, `RelayType`, `RelayOf`, `TemplateRow`, `WaSent`, `SentFile`, `VoiceUpload`, `MetaTemplate`, `TemplateSend`, `SampleFile`, `MediaSend`, `ReactionSend`, `WhatsappClient`, `WhatsappLines` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/people | `ListQuery`, `PastLesson`, `StudentCreateRequest`, `StudentListRow`, `StudentProfileRow` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/platform | `RecentRow`, `Stored`, `Session`, `PartPlan`, `People` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/reporting | `PaymentIn`, `CostLessonIn`, `LessonSourceIn`, `ExpenseIn`, `PendingIn`, `TaskIn`, `PageUrls`, `PageKey`, `PageFileRow`, `PageReportRow`, `PageFacts`, `ViewContext`, `FormColumns`, `TeacherReportParts` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/sales | `PageQuery`, `RosterFacts`, `AssignedLead`, `TeacherDayFacts` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/teaching | `TeacherOptionsQuery`, `SlotsQuery`, `LessonRow`, `RuleRow`, `SiblingRow`, `NewStudentRow`, `InvoiceRow`, `BookingPayload`, `InviteeRow`, `LinkRow`, `LessonStudentRow`, `PauseRow`, `RpcOut`, `StopPlan`, `StopRow`, `People`, `Named`, `OverviewParts`, `NoticeKey`, `NoticeTeacher`, `NoticeGuardian`, `NoticeStudent`, `Notice`, `RecordingJoinRow`, `ManageRule` | API request/response shape | @ab/shared (domain folder) |
| staff-mobile/src/booking/lesson-times | `RowCheck` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/booking/shared | `InvoiceDraft` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/booking/trial | `SummaryRow` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/calendar/overview | `TeacherFilter` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/classroom/links | `JoinableLesson` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/classroom/recordings | `RecordingSource` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/core/lib | `JobApplicant` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/core/ui | `LessonStatusText` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/earnings/lib | `PayInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/edit-time/lib | `EditState` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/feedback | `FeedbackAverage` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/finance/pricing | `Selection` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/composer | `PanelMedia`, `Draft` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/messages | `BubbleOffers` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/saved-replies | `ReplySave` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/thread | `RtcDeps`, `CallSessionApi`, `ChatActions`, `ChatSearchValue` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/threads-list | `MessageHitsState` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/ops/dashboard | `Kpi` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/ops/values | `Draft` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/registration-check/lib | `CheckErrorCode` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/sales-subscribe/lib | `ReceiptChoice`, `TransferInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/sales-subscribe/payment-link | `LinkPay` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/student-file/channel | `ChannelSeatApi` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/student-file/recordings | `RecordingFilters` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/students/course-actions | `SubRef` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/subscribe/custom-price | `CustomPrice` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/subscribe/start-date-edit | `StartDatePackage` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/alerts | `AlertRowView` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/report | `SaveState`, `ReportEntryState` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/today | `DayInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teaching/reschedule | `Scope` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/today/requests | `Answer` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/trial-date/lib | `TrialDateDraft` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/components/table-toolbar | `ColumnFilterControl`, `FilterChip`, `ExtraFilters`, `TableToolbarOptions` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/finance | `ExpenseBody`, `PaymentFilters`, `PaymentPatch`, `RecordPaymentBody`, `PayPayoutBody`, `Selection`, `CreateSubscriptionBody`, `CustomPrice`, `Scope`, `PaymentsList`, `PayBody`, `PayInput` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/messaging | `RtcDeps`, `CallSessionApi`, `InboxLead`, `Draft`, `SummaryRow`, `BubbleOffers`, `ChatSearchValue`, `ChatActions`, `MessageHitsState`, `GateChange`, `RuleFailure`, `EvolutionStateAnswer`, `EvolutionQrAnswer`, `ShownState`, `CrmTemplateStatus`, `EditMode`, `EditCall`, `EditState` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/features/people | `PayStatementBody`, `BroughtBy`, `GuardianDetail`, `StaffPhotoKind`, `StaffPhotoTarget`, `StudentListView`, `StatusCounts`, `CreateStudentBody` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/reporting | `Kpi`, `ExportKind`, `ExportRequest`, `SaveState`, `ReportEntryState`, `LinkProblem`, `AttachmentCalls`, `ReportApi` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/features/sales | `LeadSearch`, `PageSearch`, `Bind`, `SalesQuoteBody`, `SalesSubscriptionBody`, `SalesPaymentBody`, `LinkPay`, `ReceiptChoice`, `TransferInput`, `Paged`, `SalesMoveInput`, `TeacherFilter` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/teaching | `GuardianRow`, `BookSearch`, `CourseChangeTarget`, `CourseChangeBody`, `TrialDateDraft`, `InvoiceDraft`, `RowCheck`, `StatusAsk`, `PublicProblem`, `SlotsParams`, `CorrectArea`, `CorrectLesson`, `TeacherFilter`, `DayInput`, `ChannelSeatApi`, `AlertRowView` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |

## 5. Doubtful cases for the owner

| # | Case | What this PR did | To widen |
|---|---|---|---|
| D1 | ≈ 1 000 NestJS classes (services, controllers, repos, modules) | Kept: they are the api's providers, not data | — |
| D2 | API repo row types (`*.repo.ts`, `*.queries.ts`) | Kept while only the api reads them; a client copy of the same shape is moved and the api then imports the package type | Say «move rows too» |
| D3 | Same name, different meaning across apps (`Who`, `Call`, `Step`, `Answer`, `Range`, `Draft`, `Selection`, `Scope`, `Loaded`) | Kept: unrelated shapes that only share a word | — |
| D4 | Twin component Props in web and mobile (`MessageBubbleProps`, `UserActionsProps`, …) | Kept: each app's component owns its props; the data inside them moves | Say «share props in the kits» |
| D5 | Narrowed client views (`Pick<…>` of a package type) | Moved as named Picks next to the full type (`DashboardCounts`) | — |
| D6 | api builder types with the same name as a package contract (`StudentListItem`, `StudentProfile` in students.mapper.ts) | Kept: they are built from `Tables<…>` joins and carry DB-only columns; the clients read the package type | Say «the api returns the package type» and the mapper is typed against it |
| D7 | Branch name `refactor/shared-types` matches ci.yml's pure-move gate (`refactor/*`, job «refactor»), which fails any PR that is not a pure file move | Not changed: the gate is outside this PR's scope | Rename the branch outside `refactor/*`, or select the gate by `refactor/moves/*.json` only (docs/32 critic note 3) |
| D8 | Mobile `FeedbackAverage` allows nulls the package type does not | Kept in mobile: switching would remove null checks (runtime code) | Confirm the API never sends null, then drop it |
| D9 | Same small helpers still copied in web and mobile (`groupOf`/`groupSessions`, `timeEditMode`/`editMode`, `bookingBase`/`bookingPath`) | Kept: logic, not types; the session ones need an if-free rewrite | A logic slice into `@ab/client-core` |
| D10 | Re-exports of package names left in web `booking/draft/contract.ts` and mobile `booking/shared/contract.ts` (`BOOKING_KINDS`, `InvoiceInput`, …) and in web/mobile `feedback/types.ts` (`FeedbackRowView`) | Left: they predate this PR | Next slice removes them |
| D11 | Mobile `JobApplicant` (`core/lib/staff/types.ts`) vs package `JobApplicantView` | Kept: web types `status` as `string` and tests an unknown status; mobile indexes its style maps by `JobApplicantStatus`. One type needs a runtime fallback in one app | Pick `string` + a mobile fallback, or `JobApplicantStatus` + drop the web test |
| D12 | Mobile `CheckErrorCode` (`registration-check.ts`) | Kept: it is `keyof` the i18n error strings (adds `too_many_requests`, `generic`), not the API's 400 codes (`RegistrationCheckCode`) | — |
