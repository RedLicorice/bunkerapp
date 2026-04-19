-- Drop the original recursive policy from 001_initial.sql.
-- Migration 003 already created is_owner() + "profiles: owner read all".
drop policy if exists "profiles: owner read" on public.profiles;
