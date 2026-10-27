import { Module } from '@nestjs/common';
import { ActivityModule } from './common/activity/activity.module';
import { AuditModule } from './common/audit/audit.service';
import { AuthModule } from './common/auth/auth.module';
import { ClientUsageModule } from './common/client-usage/client-usage.module';
import { ConfigStoreModule } from './common/config-store/config-store.module';
import { CustomConfigModule } from './common/custom-config/custom-config.module';
import { DbModule } from './common/db/db.module';
import { IntegrationConfigModule } from './common/integrations/integration-config.module';
import { LessonEventsModule } from './common/events/lesson-events';
import { PublicConfigModule } from './common/public-config/public-config.module';
import { PushModule } from './common/push/push.module';
import { SettingsModule } from './common/settings/settings.module';
import { StorageModule } from './common/storage/storage.service';
import { BookingModule } from './modules/teaching/booking/booking.module';
import { DashboardModule } from './modules/reporting/dashboard/dashboard.module';
import { ExpensesModule } from './modules/finance/expenses/expenses.module';
import { ExportsModule } from './modules/reporting/exports/exports.module';
import { ClassroomModule } from './modules/teaching/classroom/classroom.module';
import { FeedbackModule } from './modules/teaching/feedback/feedback.module';
import { FxModule } from './modules/finance/fx/fx.module';
import { GuardiansModule } from './modules/people/guardians/guardians.module';
import { HealthController } from './modules/platform/health/health.controller';
import { InboxModule } from './modules/messaging/inbox/inbox.module';
import { SavedRepliesModule } from './modules/messaging/saved-replies/saved-replies.module';
import { InvoicesModule } from './modules/finance/invoices/invoices.module';
import { JobApplicantsModule } from './modules/sales/job-applicants/job-applicants.module';
import { LeadsModule } from './modules/sales/leads/leads.module';
import { LessonRatingModule } from './modules/teaching/lesson-rating/lesson-rating.module';
import { LessonsModule } from './modules/teaching/lessons/lessons.module';
import { MeModule } from './modules/people/me/me.module';
import { PortalModule } from './modules/people/portal';
import { MessagingJobsModule } from './modules/messaging/messaging-jobs/messaging-jobs.module';
import { NotificationRulesModule } from './modules/messaging/notification-rules/rules.module';
import { PaymentsModule } from './modules/finance/payments/payments.module';
import { SalesMoneyModule } from './modules/sales/sales-money/sales-money.module';
import { AssistantPayModule } from './modules/finance/assistant-pay/assistant-pay.module';
import { PayoutsModule } from './modules/finance/payouts/payouts.module';
import { TeacherEarningsModule } from './modules/finance/teacher-earnings/earnings.module';
import { PricingModule } from './modules/finance/pricing/pricing.module';
import { ReceivablesModule } from './modules/finance/receivables/receivables.module';
import { GoogleSyncModule } from './modules/platform/google-sync/google-sync.module';
import { ReportPdfModule } from './modules/reporting/report-pdf/report-pdf.module';
import { ReportsModule } from './modules/reporting/reports/reports.module';
import { RolesModule } from './modules/people/roles/roles.module';
import { SalesModule } from './modules/sales/sales/sales.module';
import { SalesRegistrationModule } from './modules/sales/sales-registration/sales-registration.module';
import { SignInModule } from './modules/people/sign-in';
import { SchedulingModule } from './modules/teaching/scheduling/scheduling.module';
import { StudentChannelsModule } from './modules/teaching/student-channels';
import { StudentRecordingsModule } from './modules/teaching/student-recordings/student-recordings.module';
import { StudentsModule } from './modules/people/students/students.module';
import { SubscriptionsModule } from './modules/finance/subscriptions/subscriptions.module';
import { TeacherStudentsModule } from './modules/people/teacher-students/teacher-students.module';
import { TeachersModule } from './modules/people/teachers/teachers.module';
import { UsersModule } from './modules/people/users/users.module';
import { TranslationsModule } from './modules/platform/translations/translations.module';
import { WebhookModule } from './modules/messaging/webhook/webhook.module';
import { WhatsappModule } from './modules/messaging/whatsapp/whatsapp.module';

@Module({
  imports: [
    DbModule,
    IntegrationConfigModule,
    AuditModule,
    AuthModule,
    ClientUsageModule,
    ActivityModule,
    ConfigStoreModule,
    SettingsModule,
    CustomConfigModule,
    PublicConfigModule,
    TranslationsModule,
    StorageModule,
    LessonEventsModule,
    PushModule,
    GuardiansModule,
    StudentsModule,
    TeachersModule,
    TeacherStudentsModule,
    LeadsModule,
    SalesModule,
    SalesRegistrationModule,
    JobApplicantsModule,
    MeModule,
    PortalModule,
    FxModule,
    PricingModule,
    SchedulingModule,
    BookingModule,
    InvoicesModule,
    ReceivablesModule,
    LessonsModule,
    ReportsModule,
    RolesModule,
    UsersModule,
    SignInModule,
    ReportPdfModule,
    GoogleSyncModule,
    SubscriptionsModule,
    PaymentsModule,
    SalesMoneyModule,
    PayoutsModule,
    AssistantPayModule,
    TeacherEarningsModule,
    ExpensesModule,
    DashboardModule,
    ExportsModule,
    WhatsappModule,
    NotificationRulesModule,
    InboxModule,
    SavedRepliesModule,
    FeedbackModule,
    LessonRatingModule,
    ClassroomModule,
    StudentRecordingsModule,
    StudentChannelsModule,
    MessagingJobsModule,
    WebhookModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
