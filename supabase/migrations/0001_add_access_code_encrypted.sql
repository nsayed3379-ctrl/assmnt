-- Run once in the Supabase SQL editor for any project that already ran
-- schema.sql before access_code_encrypted existed. New projects get this
-- column straight from schema.sql and don't need this file.
alter table assessment_invites
  add column if not exists access_code_encrypted text;
