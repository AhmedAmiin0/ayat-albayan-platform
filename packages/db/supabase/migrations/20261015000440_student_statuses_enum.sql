-- Owner 2026-10-15 (R-STU-05, docs/11 §7, docs/18): the student status pipeline
--   new «جديد» → trial «بانتظار الحلقة التجريبية» → pending_subscription «بانتظار الاشتراك» → active
--   → pending_renewal → expired «انتهى الاشتراك»; paused and churned unchanged.
-- Enum values ONLY: a value cannot be used in the migration that adds it, so the column default, the
-- setting, the functions and the one-time reclassification are in 20261015000441+.
alter type public.student_status add value if not exists 'new' before 'trial';
alter type public.student_status add value if not exists 'pending_subscription' after 'trial';
alter type public.student_status add value if not exists 'expired' after 'pending_renewal';
