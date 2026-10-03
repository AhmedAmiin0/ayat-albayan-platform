-- Sales portal, step 1: the sales login. A new enum value is not usable inside the transaction that
-- adds it, so it sits alone; migration 187 builds on it. The access-token hook reads profiles.role as
-- is, so a sales token carries user_role = 'sales'; admin, teacher, guardian and assistant are untouched.
alter type public.user_role add value if not exists 'sales';
