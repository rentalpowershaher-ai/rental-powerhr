create table employees(
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  password text not null,
  role text not null default 'employee',
  joined_at date default current_date,
  status text not null default 'work',
  work_start date default current_date,
  vacation_start date, vacation_end date, next_vacation_date date,
  decision_pending boolean default false,
  return_alerted boolean default false,
  created_at timestamptz default now()
);
create unique index employees_name_uq on employees (lower(full_name));
create table events(
  id bigserial primary key,
  kind text, target uuid, employee_name text, message text,
  created_at timestamptz default now()
);
-- RLS مفعّل وبدون سياسات: لا أحد يصل للجداول إلا من خلال سيرفر التطبيق
alter table employees enable row level security;
alter table events enable row level security;

-- اشتراكات الإشعارات (Push)
create table push_subscriptions(
  id bigserial primary key,
  employee_id uuid references employees(id) on delete cascade,
  endpoint text unique,
  subscription jsonb,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;

-- موقع العمل + الرقم المسلسل
alter table employees add column if not exists work_location text;
alter table employees add column if not exists serial int;
update employees e set serial = r.n from (
  select id, row_number() over (order by created_at) n from employees where role = 'employee'
) r where e.id = r.id and e.serial is null;
