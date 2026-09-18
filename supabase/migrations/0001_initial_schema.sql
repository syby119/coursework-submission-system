create type public.app_role as enum ('student', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_number text unique,
  name text not null check (char_length(trim(name)) between 1 and 100),
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  published_at timestamptz not null default now(),
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  constraint assignments_deadline_after_publication check (deadline > published_at)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_one_current_per_student unique (assignment_id, student_id)
);

create index assignments_published_deadline_idx on public.assignments (published_at, deadline);
create index submissions_assignment_idx on public.submissions (assignment_id);
create index submissions_student_idx on public.submissions (student_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
