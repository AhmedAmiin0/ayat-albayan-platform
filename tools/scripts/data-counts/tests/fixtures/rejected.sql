-- count: column_value
select name from students;
-- count: text_function
select count(*) from students where left(name, 1) = 'a';
-- count: subquery
select count(*) from students where id in (select student_id from lessons);
-- count: table_subquery
select count(*) from students where id in (table lessons);
-- count: second_statement
select count(*) from students; delete from students;
-- count: block_comment
select count(*) from students /* x */;
-- count: dollar_quote
select count(*) from students where name = $$a$$;
-- count: alias
select count(*) as n from students;
-- count: escaped_quote
select count(*) from students where name = E'\'' or id is null or name = E'\'';
-- count: backslash
select count(*) from students where name = 'a\b';
-- count: string_prefix
select count(*) from students where name = E'a';
-- count: unicode_prefix
select count(*) from students where name = U&'a';
-- count: stray_quote
select count(*) from students where name = 'a' or name = ';
-- count: quoted_name
select count(*) from students where "left"(name, 1) = 'a';
-- count: backtick
select count(*) from students where name = `a`;
-- count: name_outside_ascii
select count(*) from students where fé(name) = 'a';
-- count: other_schema
select count(*) from auth.users;
