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


## POWER SCALE v10
- Loader individual e MCC usam URL absoluta do domínio atual.
- O importador usa `APP_URL` para montar endpoints absolutos de config/import/log.
- Métricas diárias são enviadas como `campaign_level` e normalizadas em `google_ads_daily_metrics`.
- Bancos vindos da v9 sem `campaign_level` são tratados como primeira importação e refazem o histórico.
- Períodos: `APPSCRIPT_FIRST_IMPORT_DAYS` (padrão 730) e `APPSCRIPT_INCREMENTAL_DAYS` (padrão 7).
- Não há alteração de schema da v9 para a v10.


## v11 — correção de URL pública no Vercel

A v11 não depende de interpolação de variáveis na interface do Vercel. `APP_URL` deve ser uma URL absoluta (por exemplo `https://power-scale.vercel.app`). Valores literais como `http://${VERCEL_PROJECT_PRODUCTION_URL}` são ignorados automaticamente, e o backend usa `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` ou o host da requisição como fallback seguro. Não há migration de banco da v10 para a v11.
