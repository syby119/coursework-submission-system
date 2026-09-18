insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  52428800,
  array[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage: students read own submission objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'submissions'
  and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
);

create policy "storage: students add own live submission objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~* '\\.(pdf|zip|doc|docx)$'
  and exists (
    select 1 from public.assignments
    where id::text = (storage.foldername(name))[1]
      and published_at <= now()
      and deadline > now()
  )
);

create policy "storage: students update own live submission objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~* '\\.(pdf|zip|doc|docx)$'
  and exists (
    select 1 from public.assignments
    where id::text = (storage.foldername(name))[1]
      and published_at <= now()
      and deadline > now()
  )
);

create policy "storage: students remove own submission objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
);
