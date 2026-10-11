-- The sales role's label (owner, 2026-10-11: "rename the assistant to sales"). Idempotent.
-- Migration 274 showed the base role `sales` (the person who brings students, chats with leads,
-- records payments and earns commission) as «مساعد/ة» / 'Assistant'. Users now see it as
-- «المبيعات» / 'Sales'. Wording only: the key, base role, permissions and grants stay as they are.
-- The classroom teaching assistant (key `assistant`, «مساعد حلقة») is a different role, left unchanged.

update public.roles set name_ar = 'المبيعات', name_en = 'Sales' where is_system and key = 'sales';
