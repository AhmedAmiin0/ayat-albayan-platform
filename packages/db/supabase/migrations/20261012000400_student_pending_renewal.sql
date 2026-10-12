-- Owner 2026-10-12 (R-STU-05, docs/11 §7): «بانتظار التجديد», a student whose subscription has ended
-- (lessons used up or renewal date passed, no newer paid package). Set automatically by the API
-- (StudentRenewal) and reverted by a renewal payment. An enum value must be alone in its migration:
-- any SQL that uses it goes in 20261012000401+.
alter type public.student_status add value if not exists 'pending_renewal' after 'active';
