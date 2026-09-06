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
