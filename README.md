# POWER SCALE — Vercel + Supabase

Versão preparada para hospedar **frontend e API Node.js/Express no mesmo projeto Vercel**, usando Supabase para Auth e PostgreSQL.

## Arquitetura

```text
GitHub
  ↓
Vercel
  ├─ interface POWER SCALE
  └─ /api/v1/* (Node.js / Express)
          ↓
       Supabase
       ├─ Auth
       └─ PostgreSQL
```

A base da API do bundle foi alterada para `/api/v1`, portanto frontend e backend usam o mesmo domínio e não dependem de um endereço Railway.

## 1. Supabase

1. Crie o projeto no Supabase.
2. Abra SQL Editor.
3. Execute `supabase/schema.sql`.
4. Crie seu usuário em Authentication.
5. Ajuste e execute `supabase/bootstrap.sql` para criar o workspace e associar o usuário.

## 2. Variáveis na Vercel

Cadastre em **Project → Settings → Environment Variables**:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_URL
NODE_ENV=production
```

A `SUPABASE_SERVICE_ROLE_KEY` deve existir somente no ambiente do servidor/Vercel. Nunca coloque essa chave no bundle ou no GitHub.

## 3. Deploy pelo GitHub

1. Extraia esta pasta.
2. Crie um repositório GitHub e envie o conteúdo da pasta `POWER-SCALE-Vercel` para a raiz.
3. Na Vercel, clique em **Add New → Project**.
4. Importe o repositório.
5. Framework Preset: `Other` / detecção automática.
6. Não configure Root Directory se o conteúdo desta pasta estiver na raiz do repositório.
7. Adicione as variáveis acima.
8. Deploy.

Teste depois:

```text
https://SEU-PROJETO.vercel.app/health
```

Deve retornar `POWER SCALE` e `ok: true`.

## 4. Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Interface idêntica

`public/assets/index-POWER-SCALE.js` parte do bundle fornecido e mantém seus componentes e rotas, alterando a marca para POWER SCALE e a API para `/api/v1`.

**Importante:** o arquivo originalmente fornecido era o bundle JavaScript. A interface original também referencia assets externos, inclusive `assets/style-4ESN5fw-.css`. Esse CSS e quaisquer imagens/fontes que não estavam no arquivo fornecido não podem ser reconstruídos fielmente apenas a partir do JS. Para a reprodução visual 1:1 hospedada de forma independente, copie os assets públicos correspondentes para `public/assets/` mantendo exatamente os mesmos nomes/caminhos.

## Backend

O Express fica em `server.js` e as rotas da API em `src/routes/index.js`. Vercel atualmente suporta aplicações Node/Express com detecção de servidor Node, então não é necessário separar o backend em outro provedor.

Endpoints complexos cuja regra não está integralmente presente no bundle (Google OAuth/sync real, funil completo, IA de insights, captura de landing page etc.) continuam preparados como scaffold e precisam dos respectivos integradores/regras.
