-- POWER SCALE v13.8 — controle de sincronização Apps Script / MCC
create table if not exists public.google_ads_appscript_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  force_full_import boolean not null default false,
  full_import_days integer not null default 730 check (full_import_days between 1 and 3650),
  last_full_requested_at timestamptz,
  last_full_completed_at timestamptz,
  last_mcc_total integer,
  last_mcc_selected integer,
  last_mcc_ok integer,
  last_mcc_errors integer,
  updated_at timestamptz not null default now()
);
