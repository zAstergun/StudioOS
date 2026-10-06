# StudioOS

Painel de criação para criadores de conteúdo. O projeto usa Astro para as páginas, React com TypeScript para as ferramentas interativas e Tailwind CSS para os estilos.

## Começar

```sh
npm install
npm run dev
```

O servidor abre em `http://localhost:4321`. A página inicial fica em `/` e a autenticação em `/login`. Para encerrar o servidor em segundo plano, use `npx astro dev stop`; para consultar estado e logs, use `npx astro dev status` e `npx astro dev logs`.

## Supabase

Sem configuração, a tela de login funciona em modo demo local. Para conectar seu projeto:

1. Copie `.env.example` para `.env`.
2. Preencha `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` com os valores de **Project Settings → API**.
3. Execute `supabase/schema.sql` no SQL Editor do seu projeto Supabase para criar os perfis e as políticas de acesso.
4. Reinicie o servidor Astro.

Use apenas a chave pública `anon`/`publishable` no navegador. Nunca coloque a `service_role` no prefixo `PUBLIC_` nem no código cliente.

## Estrutura

- `src/pages/`: rotas Astro (`/` e `/login`).
- `src/studio/`: ferramentas, componentes React, autenticação e cliente Supabase.
- `src/styles/studio.css`: tema Tailwind e estilos globais do StudioOS.
- `supabase/schema.sql`: tabela de perfis, trigger de cadastro e políticas RLS.
- `src/skills/`: instruções usadas pelas ferramentas do estúdio.
