-- Rode depois de criar seu primeiro usuário no Supabase Auth.
-- Troque YOUR_AUTH_USER_UUID pelo UUID de auth.users.
insert into public.workspaces(name,slug) values ('POWER SCALE','power-scale') returning id;
-- Depois use o id retornado:
-- insert into public.workspace_members(workspace_id,user_id,role) values ('WORKSPACE_UUID','YOUR_AUTH_USER_UUID','owner');
-- insert into public.profiles(user_id,name,role,preferences) values ('YOUR_AUTH_USER_UUID','Administrador','admin','{"onboarding_completed":true}');
