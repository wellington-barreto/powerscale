# POWER SCALE v13 — atualização

1. No Supabase > SQL Editor, execute `supabase/v13-migration.sql`.
2. Publique o conteúdo desta pasta no Vercel.
3. Faça um novo deploy (não apenas redeploy de cache se o package.json mudou).
4. Teste `/dashboard`, `/dashboard/google-ads-metrics`, `/dashboard/platforms` e `Regras de Produtos` no menu Configurações.

A migration não apaga métricas do Google Ads. Ela cria as regras de identificação, o bucket de logos, a unicidade `workspace_id + slug` e faz upsert das 27 plataformas.
