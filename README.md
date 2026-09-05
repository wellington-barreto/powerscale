# POWER SCALE — Vercel v5

Versão com Function explícita em `api/index.js`, diagnóstico seguro das variáveis do Supabase e API Node/Express no mesmo deployment do frontend.

# POWER SCALE — Vercel + Supabase

Projeto pronto para GitHub e deploy na Vercel, mantendo a interface do bundle analisado e usando Supabase Auth/Postgres.

## Vercel — variáveis de ambiente
Cadastre em Project > Settings > Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` é opcional. Se usar domínio próprio, pode definir `https://app.seudominio.com`.

## Supabase
1. Execute `supabase/schema.sql` no SQL Editor.
2. Em Authentication > Providers > Google, mantenha o Google habilitado com o Client ID e Client Secret que você configurou.
3. Em Authentication > URL Configuration, configure a Site URL do deploy e permita `https://SEU-PROJETO.vercel.app/**` em Redirect URLs.
4. Para login por email/senha, crie um usuário em Authentication > Users. Não é necessário editar `bootstrap.sql`: no primeiro login o backend cria automaticamente `profile`, `workspace` e `workspace_members` caso não existam.

## Login
- **Google:** botão `Entrar com Google` → Supabase OAuth → `/auth/callback` → token salvo → `/dashboard`.
- **Email/senha:** `POST /api/v1/auth/login` usando Supabase Auth.
- O Cloudflare Turnstile foi removido da tela e não é necessário para autenticar.

## Deploy
Suba o conteúdo desta pasta para a raiz do repositório GitHub e importe o repositório na Vercel.

Teste:
- `/health`
- `/`
- `/dashboard`

## Observação sobre o CSS
O CSS visual original continua referenciado remotamente em `public/index.html`, pois os arquivos enviados anteriormente foram substituídos por uma página de bloqueio do Cloudflare. O bundle JS está local no projeto. Para tornar o frontend 100% independente do domínio anterior, será necessário obter o CSS/imagens reais.


## v5 — correções de autenticação Google e Trackers
- Callback Google aceita o `#access_token` retornado pelo Supabase OAuth.
- `/workspace/platforms` retorna um array, como o bundle original espera.
- `/workspace/trackers/archived` retorna `data` como array.
- Corrige a tela preta em `/dashboard/trackers` causada por `T.map is not a function`.
