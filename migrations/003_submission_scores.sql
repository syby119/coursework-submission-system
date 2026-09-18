alter table submissions
add column score numeric(8, 2) check (score >= 0);
