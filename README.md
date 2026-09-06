## POWER SCALE v12

Correção da resposta de métricas diárias para o formato esperado pelo frontend (`data.campaign`, `data.totals`, `data.rows`). Não requer migration de banco.

# POWER SCALE v9

Versão Vercel + Supabase com Google Ads Apps Script em dois modos (Conta individual e MCC) e normalização completa dos dados importados.

## O que mudou na v9
- Mantém `google_ads_import_rows` como camada RAW idempotente, com `row_key` determinístico.
- Normaliza todos os 20 segmentos produzidos pelo importador para `google_ads_segments`.
- Consolida métricas diárias de campanha em `google_ads_daily_metrics` sem duplicar valores em reimportações.
- Expande as colunas de métricas para refletir integralmente `buildMetrics()` do Apps Script.
- Retorna `segment_data` + `segment_key` no formato consumido pelo frontend.
- Agrega segmentos no período solicitado (device, gender, age, keyword, search term, location etc.).
- Preenche `snapshots_sum_*` das campanhas no endpoint `/workspace/google-ads/accounts`.
- Preenche o endpoint de funnel Google Ads e timeline diária.
- Corrige `date` nos endpoints de métricas diárias/report diário.
- Escopa Campaign ID por conta Google Ads (`workspace_id + account_id + external_id`).

## Segmentos mapeados
`campaign_roster`, `ad_group`, `gender`, `age_range`, `audience`, `keyword`, `device`, `ad`, `hour_of_day`, `day_of_week`, `location`, `placement`, `search_term`, `asset`, `labels`, `video`, `pmax_asset_group`, `pmax_asset`, `display_creative`, `demand_gen_creative`.

## Deploy / upgrade da v8
1. Faça backup do Supabase.
2. Execute `supabase/v9-migration.sql` no SQL Editor (ou execute o `schema.sql` completo se for instalação nova).
3. Publique a v9 no Vercel.
4. Execute o Apps Script novamente. As reimportações são idempotentes pela chave RAW e atualizam as tabelas normalizadas.

## Observação sobre telas
As telas de análise baseadas em Google Ads (campanhas, métricas diárias, dispositivos, gênero, idade, palavras-chave, termos, posicionamentos, dias, anúncios, públicos e demais segmentos) passam a receber dados normalizados. Métricas próprias do funil do site/tracker, como `page_views` e `passed`, não são dados do Google Ads e continuam dependendo do tracker POWER SCALE.


## POWER SCALE v10
- Loader individual e MCC usam URL absoluta do domínio atual.
- O importador usa `APP_URL` para montar endpoints absolutos de config/import/log.
- Métricas diárias são enviadas como `campaign_level` e normalizadas em `google_ads_daily_metrics`.
- Bancos vindos da v9 sem `campaign_level` são tratados como primeira importação e refazem o histórico.
- Períodos: `APPSCRIPT_FIRST_IMPORT_DAYS` (padrão 730) e `APPSCRIPT_INCREMENTAL_DAYS` (padrão 7).
- Não há alteração de schema da v9 para a v10.


### Upgrade v9 → v10 após o primeiro teste
Execute `supabase/v10-migration.sql` uma única vez antes de rodar novamente o Apps Script. Ele apenas remove as linhas de campanha que a v9 classificou incorretamente como `ad_group`; não altera tabelas nem apaga ad groups reais.


## v11 — correção de URL pública no Vercel

A v11 não depende de interpolação de variáveis na interface do Vercel. `APP_URL` deve ser uma URL absoluta (por exemplo `https://power-scale.vercel.app`). Valores literais como `http://${VERCEL_PROJECT_PRODUCTION_URL}` são ignorados automaticamente, e o backend usa `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` ou o host da requisição como fallback seguro. Não há migration de banco da v10 para a v11.


## v13
- Dashboard passa a agregar `google_ads_daily_metrics` por período/produto.
- Cadastro/edição de plataformas aceita multipart e logo.
- 27 plataformas e logos locais incluídos.
- Tela `/product-rules.html` para regras parametrizadas de produto.
- Execute `supabase/v13-migration.sql` antes do deploy.
