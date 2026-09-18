create extension if not exists pgcrypto;

create type app_role as enum ('student', 'admin');

create table users (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique check (char_length(trim(student_number)) between 1 and 64),
  name text not null check (char_length(trim(name)) between 1 and 100),
  password_hash text not null,
  role app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash char(64) not null unique,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  published_at timestamptz not null default now(),
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references users(id),
  constraint assignments_deadline_after_publication check (deadline > published_at)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  storage_path text not null unique check (
    storage_path like 'assignments/%'
    and position('..' in storage_path) = 0
    and left(storage_path, 1) <> '/'
  ),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_one_current_per_student unique (assignment_id, student_id)
);

create index sessions_expires_at_idx on sessions (expires_at);
create index assignments_published_deadline_idx on assignments (published_at, deadline);
create index submissions_assignment_idx on submissions (assignment_id);
create index submissions_student_idx on submissions (student_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

create trigger assignments_set_updated_at
before update on assignments
for each row execute function set_updated_at();

create trigger submissions_set_updated_at
before update on submissions
for each row execute function set_updated_at();
