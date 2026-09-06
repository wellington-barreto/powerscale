-- POWER SCALE v14.0 - compatibilidade financeira/garimpagem
alter table public.financial_mining add column if not exists platform_id bigint references public.platforms(id) on delete set null;
create index if not exists idx_fin_mining_ws_platform on public.financial_mining(workspace_id,platform_id);

-- Categorias mínimas esperadas pela tela original de Receitas e Despesas.
insert into public.financial_categories(workspace_id,name,type,active,payload)
select w.id,v.name,v.type,true,'{"system_seed":"v14.0"}'::jsonb
from public.workspaces w
cross join (values ('Outras Receitas','revenue'),('Ferramentas e Sistemas','expense'),('Outras Despesas','expense')) v(name,type)
where not exists (
  select 1 from public.financial_categories c where c.workspace_id=w.id and lower(c.name)=lower(v.name)
);
select 'POWER SCALE v14.0 migration OK' as status;
