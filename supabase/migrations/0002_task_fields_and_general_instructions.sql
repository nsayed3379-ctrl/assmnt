-- Run once in the Supabase SQL editor for any project that already ran
-- schema.sql before these columns existed. New projects get them straight
-- from schema.sql and don't need this file.
--
-- Both are nullable/additive: existing rows are unaffected, and every task
-- without `fields` set keeps rendering exactly as it did before (single
-- input based on task_type).
alter table assessments
  add column if not exists general_instructions text;

alter table assessment_tasks
  add column if not exists fields jsonb;
