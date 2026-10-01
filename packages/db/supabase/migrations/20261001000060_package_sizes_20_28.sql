-- docs/08 §2: the site's monthly (20 lessons) and bulk (28 lessons) packages. Own file: a new enum
-- value cannot be used in the transaction that adds it. Mirrored in packages/shared PACKAGE_SIZES.
alter type public.package_size add value if not exists '20' after '16';
alter type public.package_size add value if not exists '28' after '20';
