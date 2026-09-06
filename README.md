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
