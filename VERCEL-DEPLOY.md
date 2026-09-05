# Deploy Vercel

Importe o repositório com a raiz do projeto apontando para a pasta que contém `package.json`, `src/` e `public/`.

Não configure Build Command nem Output Directory. O Vercel detecta `src/index.js` como aplicação Express.

Variáveis obrigatórias:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Após o deploy teste `/health`.
