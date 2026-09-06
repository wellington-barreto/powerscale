# POWER SCALE v8

Versão Vercel + Supabase com integração Google Ads Apps Script em dois modos:

- Conta individual
- MCC / Manager Account

A tela `/dashboard/integracao-appscript` permite alternar entre os dois scripts e copiá-los.

## MCC
A v8 usa `AdsManagerApp.accounts().withLimit(50).executeInParallel(...)`. Cada conta cliente executa o importador POWER SCALE no próprio contexto e envia seus dados usando o próprio Customer ID.

## Importação
A primeira importação de cada Customer ID usa até 730 dias. As seguintes usam 7 dias.

## Deploy
1. Configure as variáveis de ambiente da v7/v8 no Vercel.
2. Execute `supabase/schema.sql` se ainda não aplicou o schema da v7.
3. Publique o projeto no Vercel.
4. Entre em `/dashboard/integracao-appscript` e escolha **Conta individual** ou **MCC / Administrador**.
