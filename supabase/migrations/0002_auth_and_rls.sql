create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, student_number)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), '新学生'),
    nullif(trim(new.raw_user_meta_data ->> 'student_number'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, student_number) on public.profiles to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update on public.submissions to authenticated;

create policy "profiles: users read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "profiles: admin reads all profiles"
on public.profiles for select to authenticated
using (public.is_admin());

create policy "profiles: users update permitted own fields"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "assignments: students read published assignments"
on public.assignments for select to authenticated
using (public.is_admin() or published_at <= now());

create policy "assignments: admin creates assignments"
on public.assignments for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());

create policy "assignments: admin updates assignments"
on public.assignments for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "assignments: admin deletes assignments"
on public.assignments for delete to authenticated
using (public.is_admin());

create policy "submissions: students read own submissions"
on public.submissions for select to authenticated
using (student_id = auth.uid() or public.is_admin());

create policy "submissions: students create own live submissions"
on public.submissions for insert to authenticated
with check (
  student_id = auth.uid()
  and original_filename ~* '\\.(pdf|zip|doc|docx)$'
  and storage_path like assignment_id::text || '/' || auth.uid()::text || '/%'
  and exists (
    select 1 from public.assignments
    where id = assignment_id and published_at <= now() and deadline > now()
  )
);

create policy "submissions: students update own live submissions"
on public.submissions for update to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and original_filename ~* '\\.(pdf|zip|doc|docx)$'
  and storage_path like assignment_id::text || '/' || auth.uid()::text || '/%'
  and exists (
    select 1 from public.assignments
    where id = assignment_id and published_at <= now() and deadline > now()
  )
);
