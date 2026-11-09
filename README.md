<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c4395640-82e5-4537-afb6-d5c548efdea2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project.
3. Run the app:
   `npm run dev`

Without these Supabase values, the app can use local browser storage, but changes will not sync to the database and clearing salon history is unavailable.


## Banco novo Supabase

1. Crie um novo projeto no Supabase.
2. Abra `SUPABASE_NOVO_BANCO.sql`.
3. Cole todo o conteúdo no SQL Editor e execute.
4. No deploy, configure apenas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Não configure `VITE_SUPABASE_SERVICE_ROLE_KEY`.
6. O projeto atualizado não usa polling a cada 7 segundos. A sincronização entre telas usa Supabase Realtime quando há movimentação.

O SQL também habilita o Realtime nas tabelas usadas para sincronização.


## Ajustes desta versão

- Removido o KeepAlive/polling automático do Supabase no frontend.
- Sincronização entre sessões baseada em Supabase Realtime, aplicando eventos localmente sem refazer SELECT da tabela inteira a cada evento.
- Operações de gravação principais usam `upsert` por `id` para evitar SELECT + UPDATE/INSERT desnecessários.
- Removidas as referências a nome de cliente dos registros de serviços e das telas.
- O SQL `SUPABASE_NOVO_BANCO.sql` foi atualizado para a estrutura sem `client_name`.
