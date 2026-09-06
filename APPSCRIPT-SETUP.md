# POWER SCALE — Google Ads Apps Script (v8)

A tela **Dashboard → Google Scripts** oferece agora dois modos de instalação:

## 1. Conta individual
Use quando quiser instalar o script diretamente em uma única conta Google Ads.

Fluxo:
`Conta individual → loader POWER SCALE → importador → /api/v1/google-ads/import/{uuid} → Supabase`

## 2. MCC / Manager Account
Use quando quiser instalar uma única vez na conta administradora. O loader MCC usa `AdsManagerApp.accounts().withLimit(50).executeInParallel(...)` e, dentro de cada conta cliente, baixa o mesmo importador da conta individual.

Fluxo:
`MCC → executeInParallel → conta cliente → importador POWER SCALE → API → Supabase`

### Limite MCC
O Google Ads Scripts permite no máximo 50 contas em uma chamada `executeInParallel`. A v8 limita explicitamente a seleção a 50 contas por execução para evitar que o Google rejeite toda a execução quando a MCC tiver mais contas.

## Primeira importação
O backend retorna 730 dias para uma conta ainda sem dados e 7 dias nas execuções seguintes, individualmente por `customer_id`.

## Endpoints
- `GET /api/v1/google-ads/appscript/code/:uuid`
- `GET /api/v1/google-ads/appscript/config/:uuid?customer_id=...`
- `POST /api/v1/google-ads/import/:uuid`
- `POST /api/v1/google-ads/appscript/log/:uuid`

## v9 — normalização
Cada lote recebido é preservado em `google_ads_import_rows` e, simultaneamente, normalizado em `google_ads_segments`. Registros `ad_group` formam a fonte canônica para `google_ads_daily_metrics`. O backend recalcula os dias afetados usando o RAW idempotente para evitar duplicação quando o script roda novamente.


## POWER SCALE v10
- Loader individual e MCC usam URL absoluta do domínio atual.
- O importador usa `APP_URL` para montar endpoints absolutos de config/import/log.
- Métricas diárias são enviadas como `campaign_level` e normalizadas em `google_ads_daily_metrics`.
- Bancos vindos da v9 sem `campaign_level` são tratados como primeira importação e refazem o histórico.
- Períodos: `APPSCRIPT_FIRST_IMPORT_DAYS` (padrão 730) e `APPSCRIPT_INCREMENTAL_DAYS` (padrão 7).
- Não há alteração de schema da v9 para a v10.


## v11 — correção de URL pública no Vercel

A v11 não depende de interpolação de variáveis na interface do Vercel. `APP_URL` deve ser uma URL absoluta (por exemplo `https://power-scale.vercel.app`). Valores literais como `http://${VERCEL_PROJECT_PRODUCTION_URL}` são ignorados automaticamente, e o backend usa `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` ou o host da requisição como fallback seguro. Não há migration de banco da v10 para a v11.
