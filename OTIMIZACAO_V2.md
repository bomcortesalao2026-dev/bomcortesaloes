# Otimização V2 — Bom Corte Salões

## O que foi alterado

1. **Code splitting por tela**
   - Dashboard administrativo e de vendedor
   - Filiais, Gerentes, Vendedores, Funções
   - Serviços, Aprovações, Vales, Pagamentos
   - Relatórios, Perfil e Configurações
   - Telas específicas do vendedor

   Esses módulos agora são carregados somente quando realmente são exibidos.

2. **Tela de carregamento**
   - Foi adicionado `Suspense` para evitar tela vazia enquanto um módulo é baixado.

3. **Chunks do Vite**
   - Dependências de terceiros ficam em `vendor`.
   - Supabase fica separado em `supabase`.
   - O limite de aviso foi ajustado para 700 KB, sem desativar a divisão de código.

4. **Importação duplicada do Supabase**
   - Removido o `dynamic import()` duplicado de `supabaseDatabase` em `storage.ts`.
   - O módulo passa a ser carregado de forma consistente.

## Validação

- `npm run lint`: PASSOU sem erros.
- O build deve ser executado no Windows do projeto com:
  `npm install`
  `npm run lint`
  `npm run build`

O ambiente Linux usado para esta preparação não possui o pacote binário opcional `@rollup/rollup-linux-x64-gnu`, então o build Linux não pôde ser executado aqui. Isso não altera o código-fonte e não é um erro introduzido pela otimização.
