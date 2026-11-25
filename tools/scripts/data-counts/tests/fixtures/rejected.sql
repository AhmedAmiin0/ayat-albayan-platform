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
