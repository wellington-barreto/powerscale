# POWER SCALE — Vercel + Supabase

Projeto preparado para GitHub e deploy na Vercel. O frontend React mantém o bundle da interface analisada, com a marca alterada para **POWER SCALE** e a API direcionada ao mesmo domínio (`/api/v1`). O backend Express roda na Vercel e utiliza Supabase Auth/PostgreSQL.

## 1. Variáveis de ambiente na Vercel

Cadastre:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`APP_URL` é opcional. Quando necessário, o projeto pode usar `VERCEL_PROJECT_PRODUCTION_URL` como origem de produção.

Nunca envie `SUPABASE_SERVICE_ROLE_KEY` para o GitHub ou para código client-side.

## 2. Banco

Execute no Supabase SQL Editor:

1. `supabase/schema.sql`
2. crie o usuário em Authentication
3. ajuste e execute `supabase/bootstrap.sql`

## 3. GitHub / Vercel

Suba o conteúdo desta pasta na raiz do repositório. Na Vercel use **Import Git Repository** e deixe o Root Directory na raiz.

Após o deploy, teste:

- `/health`
- `/`
- `/dashboard`

## 4. Interface original / assets

O arquivo `POWER-SCALE-assets.zip` fornecido posteriormente foi conferido e os arquivos que deveriam ser CSS/PNG/JS eram, na realidade, páginas HTML `Attention Required! | Cloudflare` de 4.574 bytes. Por isso esses arquivos não foram incorporados como se fossem assets válidos.

Para permitir o deploy imediatamente, esta versão usa temporariamente o CSS e algumas imagens públicas diretamente de `https://app.fenixscale.tech/assets/...`. O bundle JS principal está hospedado localmente no projeto e a marca foi substituída por POWER SCALE.

Para tornar o projeto 100% independente do domínio original, é necessário capturar os binários reais dos assets pelo navegador (sessão que consegue acessá-los) e depois trocar as URLs remotas por arquivos locais em `public/assets/`.

## 5. Google Ads

A integração OAuth/Google Ads continua scaffoldada. As credenciais Google não são necessárias para o primeiro deploy. Posteriormente serão adicionadas como Environment Variables e os refresh tokens de cada cliente deverão ser armazenados de forma segura no banco, não no frontend.
