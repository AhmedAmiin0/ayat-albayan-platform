# 52 — Shared types: domain and contract types move from the apps into packages

Owner 2026-11-18: «apps are not allowed to import from each other any shared code should stay in a
shared package» and «move any types classes enums or interfaces to a shared package and use it from
there if it doesn't have its own package; if the interface already lies under a specific package keep
it, if not move it to a shared package». Scope: apps/api, apps/staff-web, apps/staff-mobile,
apps/family-mobile (apps/family-web has its own routine). Branch `refactor/shared-types`.

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
| Exported type / interface / enum / class in the four apps (tests excluded) | 3545 |
| Moved in this PR (package names; app declarations deleted: 25) | 10 |
| Kept in the app (§3) | 3192 |
| Move in a later slice (§4) | 333 |

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

- **reporting / dashboard**: GET /dashboard/summary and /dashboard/work shapes join `DashboardSummary` in `@ab/money` (ledger/dashboard-views.ts, dashboard-work.ts). The api keeps `SourceKey` and `WORK_ITEMS` (module-internal). Mobile's `Summary` and `FinanceSummary` narrowings become `DashboardCounts` (a Pick in the package) and `DashboardResponse`; web's `DayRange` moves into its own `search.ts` (URL state, kept).

## 3. Kept in the app

| Reason | api | staff-web | staff-mobile | family-mobile | Examples |
|---|---|---|---|---|---|
| NestJS provider, module or implementation class | 1154 | 0 | 0 | 0 | `AppModule`, `AuditService`, `AuditModule` |
| API-internal: service / planner / rule types of one module | 541 | 0 | 0 | 0 | `AuditEntry`, `PermissionResolver`, `Role` |
| API-internal: repo rows, ports, stores, jobs, settings readers, fakes | 346 | 0 | 0 | 0 | `TokenVerifier`, `FakeQueries`, `PlainRow` |
| Kept after review in this PR (see the §2 notes) | 1 | 1 | 0 | 0 | `SourceKey`, `DayRange` |
| Component props | 0 | 452 | 46 | 0 | `ColumnFilterTextProps`, `DataTableProps`, `DataTableHeadProps` |
| Feature-local UI state, hook or search type of one app | 0 | 374 | 159 | 10 | `FilterKind`, `SortDir`, `FilterOption` |
| Component-local type (one component file) | 0 | 69 | 29 | 3 | `DiscardWords`, `RowExtras`, `SettingsView` |
| Error / implementation class | 0 | 2 | 5 | 0 | `ChatUploadError`, `ReplayedSend`, `AvatarUploadError` |

## 4. Move in a later slice (decision: move; not in this PR)

One row per module folder. These are contract or client-copy types the rules above move; this PR
took the duplicated ones first (§2). Each later slice: one domain, same rules, same checks.

| Module folder | Names | Decision | Target |
|---|---|---|---|
| api/src/common/configuration | `OverridesRefresh`, `ConfigRow`, `ConfigSnapshot`, `ConfigChange`, `CustomConfigRow` | API request/response shape | @ab/shared (domain folder) |
| api/src/common/http | `PageQuery`, `Page` | API request/response shape | @ab/shared (domain folder) |
| api/src/common/infra | `HttpProfile`, `HttpRequest`, `JsonCall`, `BytesCall`, `Http` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/finance | `CommissionRow`, `MyCommissionSource`, `MyStudentSource`, `MyPaymentSource`, `StatementsQuery`, `StatementPay`, `CommissionsQuery`, `StatementRow`, `TermsRow`, `InvoiceSortKey`, `RecentFilter`, `CatalogQuery`, `QuoteQuery`, `SubscriptionQuote`, `SubContext` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/messaging | `CallPermissionFacts`, `PermissionRequest`, `CallsApi`, `PeopleStudentRow`, `FamilyTag`, `ThreadRow`, `SavedReplyRow`, `CrmEndpoint`, `CrmCreated`, `CrmWebhookResult`, `KapsoMessage`, `Contact`, `OutboundRow`, `StatusMove`, `ReplyWindow`, `CrmMessage`, `CrmConversation`, `CrmContact`, `MessageRow`, `ThreadMessageRow`, `MessageViewInput`, `RelayRequest`, `RelayType`, `RelayOf`, `TemplateRow`, `WaSent`, `SentFile`, `VoiceUpload`, `MetaTemplate`, `TemplateSend`, `SampleFile`, `MediaSend`, `ReactionSend`, `WhatsappClient`, `WhatsappLines` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/people | `ListQuery`, `Page`, `PastLesson`, `StudentCreateRequest`, `StudentListRow`, `StudentListItem`, `StudentProfileRow`, `StudentProfile` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/platform | `RecentRow`, `Stored`, `Session`, `PartPlan`, `People` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/reporting | `DashboardResponse`, `PaymentIn`, `CostLessonIn`, `LessonSourceIn`, `ExpenseIn`, `PendingIn`, `TaskIn`, `PageUrls`, `PageKey`, `PageFileRow`, `PageReportRow`, `PageFacts`, `ViewContext`, `FormColumns`, `TeacherReportParts` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/sales | `PageQuery`, `Page`, `RosterFacts`, `AssignedLead`, `TeacherDayFacts` | API request/response shape | @ab/shared (domain folder) |
| api/src/modules/teaching | `TeacherOptionsQuery`, `SlotsQuery`, `LessonRow`, `RuleRow`, `SiblingRow`, `NewStudentRow`, `InvoiceRow`, `BookingPayload`, `InviteeRow`, `LinkRow`, `LessonStudentRow`, `PauseRow`, `RpcOut`, `StopPlan`, `StopRow`, `People`, `Named`, `OverviewParts`, `NoticeKey`, `NoticeTeacher`, `NoticeGuardian`, `NoticeStudent`, `Notice`, `RecordingJoinRow`, `ManageRule` | API request/response shape | @ab/shared (domain folder) |
| staff-mobile/src/assistants/api | `AssistantRow`, `LedgerFilter`, `StatementFilter` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/booking/lesson-times | `RowCheck` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/booking/shared | `InvoiceDraft`, `BookingExtras`, `MakeupRequest`, `BookingBody`, `MediaUrl` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/booking/trial | `SummaryRow` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/calendar/overview | `TeacherFilter` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/classroom/links | `JoinableLesson` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/classroom/recordings | `RecordingSource` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/classroom/sessions | `SessionGroup` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/core/lib | `Page`, `Teacher`, `TeacherListItem`, `AvailabilityRow`, `TimeOff`, `JobApplicant` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/core/ui | `LessonStatusText` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/earnings/hooks | `SessionFilter` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/earnings/lib | `PayInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/edit-time/lib | `EditState`, `TimeEditInfo`, `EditableLesson`, `LessonTimeEditBody` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/feedback | `FeedbackListRow`, `FeedbackAverage` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/finance/pricing | `Selection` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/finance/summary | `FinanceSummary` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/composer | `PanelMedia`, `Draft` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/leads | `LeadSort` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/messages | `BubbleOffers`, `ThreadFile` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/saved-replies | `ReplySave` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/shared | `Lead` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/inbox/thread | `RtcDeps`, `CallSessionApi`, `ChatActions`, `ChatSearchValue` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/inbox/threads-list | `MessageHitsState` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/money/payments | `SubscriptionFilter` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/money/shared | `PeriodTotal`, `PaymentsPage` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/ops/dashboard | `WorkTab`, `Kpi` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/ops/notif-rules | `AudienceTab` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/ops/values | `Draft` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/registration-check/lib | `CheckBy`, `CheckErrorCode` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/sales-subscribe/lib | `ReceiptChoice`, `TransferInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/sales-subscribe/payment-link | `LinkPay` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/sales/sales | `SubscriptionKind`, `SalesSubscription` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/student-file/channel | `ChannelSeatApi` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/student-file/recordings | `RecordingFilters` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/students/course-actions | `SubRef` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/students/list | `TeacherOption` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/students/shared | `StudentRef`, `StudentListItem`, `StudentProfile` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/subscribe/custom-price | `QuotedPrice`, `CustomPrice` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/subscribe/start-date-edit | `StartDatePackage` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/alerts | `AlertRowView` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/report | `SaveState`, `ReportEntryState` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teacher/today | `DayInput` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/teaching/reschedule | `Scope` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/today/requests | `Answer` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-mobile/src/trial-date/lib | `TrialDateDraft` | Same client logic in web + mobile | @ab/client-core |
| staff-mobile/src/users/shared | `UsersView` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/components/table-toolbar | `ColumnFilterControl`, `FilterChip`, `ExtraFilters`, `TableToolbarOptions` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/finance | `ExpenseBody`, `PaymentFilters`, `PeriodTotal`, `PaymentPatch`, `RecordPaymentBody`, `PayPayoutBody`, `Selection`, `Page`, `CreateSubscriptionBody`, `QuotedPrice`, `CustomPrice`, `SubscriptionFilter`, `Scope`, `SessionFilter`, `PaymentsList`, `PayBody`, `PayInput` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/messaging | `RtcDeps`, `CallSessionApi`, `ThreadFile`, `InboxLead`, `Draft`, `SummaryRow`, `BubbleOffers`, `ChatSearchValue`, `ChatActions`, `MessageHitsState`, `GateChange`, `AudienceTab`, `RuleFailure`, `EvolutionStateAnswer`, `EvolutionQrAnswer`, `ShownState`, `CrmTemplateStatus`, `EditMode`, `EditCall`, `EditState` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/features/people | `AssistantRow`, `LedgerFilter`, `StatementFilter`, `PayStatementBody`, `BroughtBy`, `GuardianDetail`, `StaffPhotoKind`, `StaffPhotoTarget`, `StudentListView`, `StatusCounts`, `CreateStudentBody`, `RecordingFilters`, `Page`, `StudentRef`, `StudentListItem`, `StudentProfile`, `TeacherOption`, `DuplicateBody`, `Teacher`, `TeacherListRow`, `AvailabilityRow`, `TimeOff`, `UsersView` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/platform | `PresenceChat` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/features/reporting | `Kpi`, `WorkTab`, `DashboardData`, `ExportKind`, `ExportRequest`, `GateProblem`, `SaveState`, `ReportEntryState`, `LinkProblem`, `AttachmentCalls`, `ReportApi` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/features/sales | `LeadSort`, `LeadRow`, `JobApplicantRow`, `Page`, `LeadSearch`, `PageSearch`, `Bind`, `SalesQuoteBody`, `SalesSubscriptionBody`, `SalesPaymentBody`, `LinkPay`, `ReceiptChoice`, `TransferInput`, `Paged`, `SubscriptionKind`, `SalesSubscription`, `SalesPerson`, `CheckBy`, `CheckErrorCode`, `SalesMoveInput`, `TeacherFilter` | Same client logic in web + mobile | @ab/client-core |
| staff-web/src/features/teaching | `GuardianRow`, `BookSearch`, `CourseChangeTarget`, `CourseChangeBody`, `BookingBody`, `TrialDateDraft`, `InvoiceDraft`, `BookingMode`, `RowCheck`, `RecordingSource`, `MuteCall`, `RoomStatus`, `TileView`, `RoomSnapshot`, `MediaDevice`, `MediaFailure`, `RoomClient`, `ModeratedEvent`, `DataSendOptions`, `DataPacketIn`, `SessionGroup`, `GrantShare`, `StatusAsk`, `PublicProblem`, `Rating`, `FeedbackSubmitBody`, `FeedbackListRow`, `FeedbackPage`, `Window`, `SlotsParams`, `CorrectArea`, `CorrectLesson`, `TimeEditInfo`, `EditableLesson`, `TeacherFilter`, `DayInput`, `ChannelRef`, `ChannelSeatApi`, `AlertRowView` | Client copy of an API shape | @ab/shared (or the api type it mirrors) |
| staff-web/src/lib/settings | `LessonStatusText` | Same client logic in web + mobile | @ab/client-core |

## 5. Doubtful cases for the owner

| # | Case | What this PR did | To widen |
|---|---|---|---|
| D1 | ≈ 1 000 NestJS classes (services, controllers, repos, modules) | Kept: they are the api's providers, not data | — |
| D2 | API repo row types (`*.repo.ts`, `*.queries.ts`) | Kept while only the api reads them; a client copy of the same shape is moved and the api then imports the package type | Say «move rows too» |
| D3 | Same name, different meaning across apps (`Who`, `Call`, `Step`, `Answer`, `Range`, `Draft`, `Selection`, `Scope`, `Loaded`) | Kept: unrelated shapes that only share a word | — |
| D4 | Twin component Props in web and mobile (`MessageBubbleProps`, `UserActionsProps`, …) | Kept: each app's component owns its props; the data inside them moves | Say «share props in the kits» |
| D5 | Narrowed client views (`Pick<…>` of a package type) | Moved as named Picks next to the full type (`DashboardCounts`) | — |
