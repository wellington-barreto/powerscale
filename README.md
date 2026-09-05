# POWER SCALE — Vercel v6

Correção do módulo Financeiro > Resultados Empresa.

- `/workspace/financial/company?year=YYYY` agora retorna `{ data: { year, rows: [] } }` no formato esperado pelo frontend.
- Cada row contém `category_id`, `category_name`, `category_type`, `months`, `by_currency`, `total` e `has_google_ads`.
- `PUT /workspace/financial/company` persiste valores mensais em `financial_company_settings.settings.values`.
- O bundle possui fallback `{rows:[]}` para impedir tela preta caso a API venha sem dados.

Mantenha as variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY na Vercel.
