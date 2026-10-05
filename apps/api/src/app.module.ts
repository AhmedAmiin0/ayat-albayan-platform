import { Module } from '@nestjs/common';
import { AuditModule } from './common/audit/audit.service';
import { AuthModule } from './common/auth/auth.module';
import { DbModule } from './common/db/db.module';
import { LessonEventsModule } from './common/events/lesson-events';
import { PushModule } from './common/push/push.module';
import { SettingsModule } from './common/settings/settings.module';
import { StorageModule } from './common/storage/storage.service';
import { BookingModule } from './modules/booking/booking.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FxModule } from './modules/fx/fx.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { HealthController } from './modules/health/health.controller';
import { InboxModule } from './modules/inbox/inbox.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { JobApplicantsModule } from './modules/job-applicants/job-applicants.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LessonRatingModule } from './modules/lesson-rating/lesson-rating.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { MeModule } from './modules/me/me.module';
import { MessagingJobsModule } from './modules/messaging-jobs/messaging-jobs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { TeacherEarningsModule } from './modules/teacher-earnings/earnings.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { ReportPdfModule } from './modules/report-pdf/report-pdf.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { StudentsModule } from './modules/students/students.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TeacherStudentsModule } from './modules/teacher-students/teacher-students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    DbModule,
    AuditModule,
    AuthModule,
    SettingsModule,
    StorageModule,
    LessonEventsModule,
    PushModule,
    GuardiansModule,
    StudentsModule,
    TeachersModule,
    TeacherStudentsModule,
    LeadsModule,
    SalesModule,
    JobApplicantsModule,
    MeModule,
    FxModule,
    PricingModule,
    SchedulingModule,
    BookingModule,
    InvoicesModule,
    ReceivablesModule,
    LessonsModule,
    ReportsModule,
    ReportPdfModule,
    SubscriptionsModule,
    PaymentsModule,
    PayoutsModule,
    TeacherEarningsModule,
    ExpensesModule,
    DashboardModule,
    ExportsModule,
    WhatsappModule,
    InboxModule,
    FeedbackModule,
    LessonRatingModule,
    ClassroomModule,
    MessagingJobsModule,
    WebhookModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
