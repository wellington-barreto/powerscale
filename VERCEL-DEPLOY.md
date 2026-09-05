# POWER SCALE v4 — Deploy na Vercel

Esta versão usa uma Function explícita em `api/index.js`.

## Estrutura que deve aparecer na raiz do GitHub

- `api/index.js`
- `package.json`
- `vercel.json`
- `public/`
- `src/`
- `supabase/`

Na Vercel use Root Directory `./` e Framework Preset `Other`.
Não configure Output Directory.

## Variáveis

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (opcional)

Depois de alterar variáveis, faça Redeploy.

## Testes após deploy

1. `/health`
2. `/api/debug/config`
3. login por e-mail/senha
4. login Google

`/api/debug/config` nunca mostra valores secretos; apenas `true/false`.
