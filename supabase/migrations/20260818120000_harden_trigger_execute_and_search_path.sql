-- Hide signup/role trigger functions from PostgREST RPC, and pin search_path
-- on helpers the advisor flagged as mutable.

-- Triggers still fire: postgres owns protect_profile_role's table; auth.users
-- is owned by supabase_auth_admin, so that role must keep EXECUTE.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;
grant execute on function public.protect_profile_role() to postgres, service_role;

-- Bodies already use NEW/OLD/now() or schema-qualified public.profiles.
alter function public.set_updated_at() set search_path = '';
alter function public.set_posts_project_due_at() set search_path = '';
alter function public.generate_referral_code() set search_path = '';
