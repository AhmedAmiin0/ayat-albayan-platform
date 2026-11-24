import type { Enums } from '@ab/db';
import type {
  AdminTaskKind,
  AnyPushKind,
  Attendance,
  FeedbackKind,
  FeedbackRecommend,
  Gender,
  Grade,
  JobApplicantStatus,
  LeadSource,
  LeadStatus,
  LessonStatus,
  MessageDirection,
  MessageStatus,
  NumberPurpose,
  PackageSize,
  PaymentKind,
  PaymentMethod,
  PayoutStatus,
  PdfStatus,
  Program,
  ReportStatus,
  ScheduleRuleStatus,
  StudentStatus,
  SubscriptionStatus,
  TeacherStatus,
  TemplateCategory,
  TemplateStatus,
  UserRole,
} from '@ab/catalog';
import { describe, expectTypeOf, it } from 'vitest';

// The domain packages derive these from their own arrays; the api typecheck is what catches drift
// from the generated DB enums, so a missing or extra value fails `pnpm typecheck` here.
describe('catalog enums match the DB enums', () => {
  it('people, leads and lessons', () => {
    expectTypeOf<LeadStatus>().toEqualTypeOf<Enums<'lead_status'>>();
    expectTypeOf<LeadSource>().toEqualTypeOf<Enums<'lead_source'>>();
    expectTypeOf<LessonStatus>().toEqualTypeOf<Enums<'lesson_status'>>();
    expectTypeOf<SubscriptionStatus>().toEqualTypeOf<Enums<'subscription_status'>>();
    expectTypeOf<Program>().toEqualTypeOf<Enums<'program'>>();
    expectTypeOf<Grade>().toEqualTypeOf<Enums<'grade'>>();
    expectTypeOf<Attendance>().toEqualTypeOf<Enums<'attendance'>>();
    expectTypeOf<PackageSize>().toEqualTypeOf<Enums<'package_size'>>();
    expectTypeOf<Gender>().toEqualTypeOf<Enums<'gender'>>();
    expectTypeOf<StudentStatus>().toEqualTypeOf<Enums<'student_status'>>();
    expectTypeOf<TeacherStatus>().toEqualTypeOf<Enums<'teacher_status'>>();
    expectTypeOf<JobApplicantStatus>().toEqualTypeOf<Enums<'job_applicant_status'>>();
    expectTypeOf<ScheduleRuleStatus>().toEqualTypeOf<Enums<'schedule_rule_status'>>();
    expectTypeOf<UserRole>().toEqualTypeOf<Enums<'user_role'>>();
  });

  it('finance', () => {
    expectTypeOf<ReportStatus>().toEqualTypeOf<Enums<'report_status'>>();
    expectTypeOf<PdfStatus>().toEqualTypeOf<Enums<'pdf_status'>>();
    expectTypeOf<PaymentMethod>().toEqualTypeOf<Enums<'payment_method'>>();
    expectTypeOf<PayoutStatus>().toEqualTypeOf<Enums<'payout_status'>>();
    expectTypeOf<PaymentKind>().toEqualTypeOf<Enums<'payment_kind'>>();
    expectTypeOf<AdminTaskKind>().toEqualTypeOf<Enums<'admin_task_kind'>>();
  });

  it('messaging and feedback', () => {
    expectTypeOf<MessageDirection>().toEqualTypeOf<Enums<'message_direction'>>();
    expectTypeOf<MessageStatus>().toEqualTypeOf<Enums<'message_status'>>();
    expectTypeOf<TemplateStatus>().toEqualTypeOf<Enums<'template_status'>>();
    expectTypeOf<TemplateCategory>().toEqualTypeOf<Enums<'template_category'>>();
    expectTypeOf<AnyPushKind>().toEqualTypeOf<Enums<'push_kind'>>();
    expectTypeOf<NumberPurpose>().toEqualTypeOf<Enums<'wa_line'>>();
    expectTypeOf<FeedbackKind>().toEqualTypeOf<Enums<'feedback_kind'>>();
    expectTypeOf<FeedbackRecommend>().toEqualTypeOf<Enums<'feedback_recommend'>>();
  });
});
