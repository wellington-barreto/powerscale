# POWER SCALE — endpoints extraídos do bundle
Base original observada: `/api/v1`. Os endpoints `/workspace/*` usam Bearer token no frontend.

## Auth / Profile
- POST `/auth/login`
- GET `/user`
- GET `/auth/google/ads-url`
- PUT `/profile`
- PUT `/profile/password`
- PUT `/profile/preferences`

## Workspace / Dashboard
- GET `/workspace/plan-usage`
- POST `/workspace/dashboard`
- POST `/workspace/dashboard/charts/sales`

## Visitors
- POST `/workspace/visitors-logs?page=:page`
- GET `/workspace/visitors-logs/:id`
- GET `/workspace/visitors-logs/:id/replay`
- POST `/workspace/visitors-logs/:id/insight`

## Canvas
- GET `/workspace/canvas-views`
- POST `/workspace/canvas-views`
- DELETE `/workspace/canvas-views/:id`

## Trackers
- GET `/workspace/trackers`
- POST `/workspace/trackers`
- PUT `/workspace/trackers/:id`
- DELETE `/workspace/trackers/:id`
- GET `/workspace/trackers/archived`
- POST `/workspace/trackers/:id/restore`
- GET `/workspace/trackers/:id/scroll-analytics`
- GET `/workspace/trackers/unlinked-campaigns/count`

## Platforms
- GET `/workspace/platforms`
- POST `/workspace/platforms`
- POST `/workspace/platforms/:id`
- GET `/workspace/user-platforms`
- POST `/workspace/user-platforms`
- DELETE `/workspace/user-platforms/:id`

## Domains / Sites
- GET `/workspace/domains?page=:page`
- POST `/workspace/domains`
- POST `/workspace/domains/:id/verify`
- DELETE `/workspace/domains/:id`
- GET `/workspace/sites?...`
- POST `/workspace/sites`
- PUT `/workspace/sites/:id`
- DELETE `/workspace/sites/:id`
- POST `/workspace/landing-pages/:id/capture`

## Google / Google Ads
- GET `/workspace/google-accounts`
- GET `/workspace/google-accounts/:id/ad-accounts`
- DELETE `/workspace/google-accounts/:id`
- GET `/workspace/google-ads/appscript-accounts`
- POST `/workspace/google-ads/accounts`
- GET `/workspace/google-ads/integrations`
- POST `/workspace/google-ads/campaigns/:id/link-tracker`
- DELETE `/workspace/google-ads/campaigns/:id/link-tracker`
- PATCH `/workspace/google-ads/campaigns/:id/validation-status`
- POST `/workspace/google-ads/campaigns/:id/daily-metrics`
- POST `/workspace/google-ads/metrics/funnel`
- POST `/workspace/google-ads/segments`
- GET `/workspace/google-ads/kanban-rules`
- POST `/workspace/google-ads/kanban-rules`
- PATCH `/workspace/google-ads/accounts/:id/status`
- PATCH `/workspace/google-ads/synced-accounts/:id/toggle`
- GET `/workspace/google-ads/report-daily?campaign_id=&start_date=&end_date=`
- POST `/workspace/google-ads/report-daily/note`
- POST `/workspace/google-ads/report-daily/override`
- POST `/workspace/google-ads/import-sync`
- `/workspace/google-ads/synced-accounts` (uso encontrado via cliente genérico)
- `/workspace/google-ads/synced-accounts/:id` (uso encontrado via cliente genérico)

## Financeiro
- GET/POST `/workspace/financial/categories`
- PUT/DELETE `/workspace/financial/categories/:id`
- GET `/workspace/financial/dashboard?year=&month=`
- GET `/workspace/financial/company?year=`
- PUT `/workspace/financial/company`
- GET/POST `/workspace/financial/entries`
- PUT/DELETE `/workspace/financial/entries/:id`
- GET/POST `/workspace/financial/mining`
- PUT/DELETE `/workspace/financial/mining/:id`
- POST `/workspace/financial/mining/:id/convert`
- GET/PUT `/workspace/financial/viability`

## Observação
Os caminhos acima foram extraídos do JavaScript. O schema SQL e algumas regras de resposta são reconstruções/inferências para permitir uma implementação equivalente em Railway + Supabase; não representam conhecimento do backend original não presente no bundle.
