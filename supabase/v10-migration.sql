-- POWER SCALE v10
-- Limpeza segura do erro de classificação da v9.
-- A v9 marcou algumas linhas de métricas de campanha como segment_type='ad_group'
-- mesmo sem possuírem ad_group. A v10 passa a usar segment_type='campaign_level'.
--
-- Não há alteração de estrutura/tabelas nesta versão.

begin;

-- Remove somente os segmentos normalizados artificiais criados pela v9.
delete from public.google_ads_segments
where segment_type = 'ad_group'
  and segment_key = 'campaign'
  and coalesce(dimension, '{}'::jsonb) = '{}'::jsonb;

-- Remove somente as linhas RAW de campanha que foram rotuladas incorretamente como ad_group.
-- Linhas reais de ad_group possuem o objeto payload.ad_group.
delete from public.google_ads_import_rows
where segment_type = 'ad_group'
  and payload->>'source' = 'google_ads'
  and payload ? 'campaign'
  and not (payload ? 'ad_group');

commit;
