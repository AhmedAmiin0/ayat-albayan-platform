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
-- count: keyword_function
select count(*) from students where name = current_user;
-- count: keyword_function_upper
select count(*) from students where created_at < CURRENT_TIMESTAMP;
-- count: row_function
select count(*) from students where students.row_to_json is null;
-- count: field_function
select count(*) from students where (name).length > 3;
-- count: qualified_column
select count(*) from students where public.students.id is null;
-- count: group_by
select count(*) from students where status is null group by status;
-- count: order_and_limit
select count(*) from students where status is null order by 1 limit 1;
-- count: catalog_cast
select count(*) from students where 'students'::regclass is not null;
-- count: typed_string
select count(*) from students where regclass 'students' is not null;
-- count: word_before_string
select count(*) from students where name like 'a%';
-- count: array_catalog_cast
select count(*) from students where '{10}'::_regrole is not null;
-- count: other_type_cast
select count(*) from students where 'a=r/b'::aclitem is not null;
-- count: number_cast
select count(*) from students where id::int8 > 0;
-- count: spaced_cast
select count(*) from students where 'students':: regclass is not null;
-- count: semicolon_in_condition
select count(*) from students where id is null; delete from students;
-- count: block_comment_in_condition
select count(*) from students where id /* ' */ = pg_sleep(1) /* ' */ is null;
-- count: line_comment_in_condition
select count(*) from students where id is null -- x;
-- count: backtick_in_condition
select count(*) from students where name = `;
-- count: spaced_field
select count(*) from students where students . row_to_json is null;
-- count: underscore_field
select count(*) from students where students._secret is null;
-- count: spaced_call
select count(*) from students where left (name, 1) = 'a';
-- count: call_glued_to_number
select count(*) from students where 1left(name, 1) = 'a';
-- count: other_statement
explain analyze select count(*) from students;
-- count: word_current_catalog
select count(*) from students where name = current_catalog;
-- count: word_current_date
select count(*) from students where created_at < current_date;
-- count: word_current_role
select count(*) from students where name = current_role;
-- count: word_current_schema
select count(*) from students where name = current_schema;
-- count: word_current_time
select count(*) from students where created_at < current_time;
-- count: word_localtime
select count(*) from students where created_at < localtime;
-- count: word_localtimestamp
select count(*) from students where created_at < localtimestamp;
-- count: word_session_user
select count(*) from students where name = session_user;
-- count: word_system_user
select count(*) from students where name = system_user;
-- count: word_user
select count(*) from students where name = user;
-- count: clause_fetch
select count(*) from students where id is null fetch first 1 row only;
-- count: clause_for
select count(*) from students where id is null for update;
-- count: clause_having
select count(*) from students where id is null having true;
-- count: clause_limit
select count(*) from students where id is null limit 1;
-- count: clause_offset
select count(*) from students where id is null offset 1;
-- count: clause_order
select count(*) from students where id is null order by 1;
-- count: clause_union
select count(*) from students where id is null union;
-- count: clause_intersect
select count(*) from students where id is null intersect;
-- count: clause_except
select count(*) from students where id is null except;
-- count: clause_window
select count(*) from students where id is null window;
