-- ============================================================
-- BOM CORTE SALÕES — SUPABASE
-- Estrutura completa sem cliente + Realtime sem polling/KeepAlive
--
-- IMPORTANTE:
-- 1) O frontend deve usar somente a chave pública/anon (ou publishable).
-- 2) NUNCA coloque SUPABASE_SERVICE_ROLE_KEY no frontend.
-- 3) Este SQL não cria nenhuma coluna de cliente em registros_servicos.
-- 4) O Realtime emite eventos somente quando ocorre INSERT/UPDATE/DELETE.
-- 5) A tela ainda pode fazer uma leitura inicial quando necessário;
--    o que foi removido é a consulta periódica automática.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- FILIAIS
-- ============================================================

create table if not exists public.filiais (
  id text primary key,
  name text not null,
  address text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  zip text not null,
  phone text not null,
  status text not null default 'ATIVA'
    check (status in ('ATIVA','INATIVA')),
  manager_id text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNÇÕES
-- ============================================================

create table if not exists public.funcoes (
  id text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'ATIVA'
    check (status in ('ATIVA','INATIVA')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CATEGORIAS DE SERVIÇOS
-- ============================================================

create table if not exists public.categorias_servicos (
  id text primary key,
  name text not null,
  description text,
  status text not null default 'ATIVA'
    check (status in ('ATIVA','INATIVA')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- SERVIÇOS
-- ============================================================

create table if not exists public.servicos (
  id text primary key,
  name text not null,
  description text not null default '',
  default_price numeric(12,2) not null default 0,
  commission_percent numeric(7,2) not null default 0,
  status text not null default 'ATIVO'
    check (status in ('ATIVO','INATIVO')),
  funcao_id text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USUÁRIOS
-- ============================================================

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null
    check (role in ('ADMIN','GERENTE','VENDEDOR')),
  filial_id text,
  funcao_id text,
  status text not null default 'ATIVO'
    check (status in ('ATIVO','INATIVO')),
  phone text,
  avatar text,
  created_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx
  on public.users (lower(email));

-- ============================================================
-- REGISTROS DE SERVIÇOS
-- SEM NOME/ID DE CLIENTE
-- ============================================================

create table if not exists public.registros_servicos (
  id text primary key,
  filial_id text not null,
  vendedor_id text not null,
  servico_id text not null,

  quantidade integer not null default 1,
  valor_unitario numeric(12,2),
  valor_cobrado numeric(12,2) not null default 0,

  commission_percent numeric(7,2) not null default 0,
  valor_comissao numeric(12,2) not null default 0,
  valor_salao numeric(12,2) not null default 0,

  data_hora timestamptz not null,
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE','APROVADO','REPROVADO','PAGO')),

  motivo_reprovacao text,
  justificativa_reprovacao text,

  data_aprovacao timestamptz,
  aprovado_por_id text,
  aprovado_por_nome text,

  edit_history jsonb,

  weekly_payment_id text,

  observacoes text,

  notificacao text,
  notificacao_data timestamptz,
  notificacao_autor text,

  created_at timestamptz not null default now()
);

-- Se a tabela já existia na versão anterior, remove definitivamente
-- a coluna de cliente.
alter table public.registros_servicos
  drop column if exists client_name;

-- ============================================================
-- VALES
-- ============================================================

create table if not exists public.vales (
  id text primary key,
  vendedor_id text not null,
  filial_id text not null,

  valor numeric(12,2) not null default 0,
  valor_solicitado numeric(12,2),

  motivo text not null default '',
  data_solicitacao timestamptz not null,
  data timestamptz,

  status text not null default 'PENDENTE'
    check (status in (
      'PENDENTE',
      'APROVADO',
      'REPROVADO',
      'PAGO',
      'DESCONTADO'
    )),

  motivo_reprovacao text,
  justificativa_reprovacao text,

  aprovado_por_id text,
  aprovado_por_nome text,

  observacao_admin text,

  weekly_payment_id text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- PAGAMENTOS SEMANAIS
-- ============================================================

create table if not exists public.pagamentos_semanais (
  id text primary key,

  filial_id text not null,
  vendedor_id text not null,

  semana_ref text,
  periodo_inicio date not null,
  periodo_fim date not null,

  servicos_ids jsonb not null default '[]'::jsonb,
  servico_ids jsonb,

  vales_ids jsonb not null default '[]'::jsonb,
  vale_ids jsonb,

  total_comissao_bruta numeric(12,2) not null default 0,
  total_comissao numeric(12,2),

  total_vales_descontados numeric(12,2) not null default 0,
  vales_descontados numeric(12,2),

  valor_liquido_pago numeric(12,2) not null default 0,
  valor_liquido numeric(12,2),

  total_servicos_count integer,
  faturamento_realizado numeric(12,2),
  outros_descontos numeric(12,2),

  status text not null default 'PENDENTE'
    check (status in ('PENDENTE','PROCESSANDO','PAGO')),

  data_pagamento timestamptz not null,

  forma_pagamento text not null
    check (forma_pagamento in (
      'PIX',
      'TRANSFERENCIA',
      'DINHEIRO',
      'CHEQUE',
      'OUTRO'
    )),

  observacoes text,
  observacao text,

  pago_por_id text,
  pago_por_nome text,

  created_at timestamptz not null default now(),

  saldo_negativo_carregado numeric(12,2),
  saldo_negativo_quitado boolean,
  gerou_saldo_negativo boolean
);

-- ============================================================
-- AUDITORIA
-- ============================================================

create table if not exists public.auditoria_logs (
  id text primary key,
  data_hora timestamptz not null,

  usuario_id text not null,
  usuario_nome text not null,
  usuario_role text not null
    check (usuario_role in ('ADMIN','GERENTE','VENDEDOR')),

  acao text not null,

  registro_tipo text not null,
  registro_id text not null,
  registro_descricao text not null,

  valor_anterior text,
  novo_valor text,
  detalhes text
);

-- ============================================================
-- CONFIGURAÇÃO DO SISTEMA
-- ============================================================

create table if not exists public.system_config (
  id uuid primary key default gen_random_uuid(),

  salon_network_name text not null default 'Bom Corte Salões',

  logo_url text,
  logo_type text default 'image',

  slogan text default 'Rede de Alta Performance & Gestão de Salões',

  primary_color text default '#C8A45D',

  auto_approve_by_manager boolean not null default true,

  closing_day_of_week text default 'Segunda-feira',

  currency_symbol text default 'R$',

  menu_customizations jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists registros_servicos_filial_idx
  on public.registros_servicos(filial_id);

create index if not exists registros_servicos_vendedor_idx
  on public.registros_servicos(vendedor_id);

create index if not exists registros_servicos_servico_idx
  on public.registros_servicos(servico_id);

create index if not exists registros_servicos_status_idx
  on public.registros_servicos(status);

create index if not exists registros_servicos_data_hora_idx
  on public.registros_servicos(data_hora desc);

create index if not exists vales_vendedor_idx
  on public.vales(vendedor_id);

create index if not exists vales_filial_idx
  on public.vales(filial_id);

create index if not exists vales_status_idx
  on public.vales(status);

create index if not exists pagamentos_vendedor_idx
  on public.pagamentos_semanais(vendedor_id);

create index if not exists pagamentos_filial_idx
  on public.pagamentos_semanais(filial_id);

create index if not exists pagamentos_periodo_idx
  on public.pagamentos_semanais(periodo_inicio, periodo_fim);

create index if not exists auditoria_data_idx
  on public.auditoria_logs(data_hora desc);

-- ============================================================
-- REALTIME
--
-- Não existe polling neste SQL.
-- Os eventos são emitidos quando os dados realmente mudam.
-- ============================================================

do $$
begin
  begin
    alter publication supabase_realtime
      add table public.registros_servicos;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.vales;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.pagamentos_semanais;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.users;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.filiais;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.funcoes;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime
      add table public.servicos;
  exception
    when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- RLS
--
-- ATENÇÃO:
-- O aplicativo atual usa uma tabela própria "users" para login.
-- Por isso, estas políticas permitem o uso pela chave anon.
--
-- Para um ambiente de produção com dados sensíveis, o recomendado
-- é migrar a autenticação para Supabase Auth e restringir as
-- políticas por usuário/filial.
-- ============================================================

alter table public.filiais enable row level security;
alter table public.funcoes enable row level security;
alter table public.categorias_servicos enable row level security;
alter table public.servicos enable row level security;
alter table public.users enable row level security;
alter table public.registros_servicos enable row level security;
alter table public.vales enable row level security;
alter table public.pagamentos_semanais enable row level security;
alter table public.auditoria_logs enable row level security;
alter table public.system_config enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'filiais',
    'funcoes',
    'categorias_servicos',
    'servicos',
    'users',
    'registros_servicos',
    'vales',
    'pagamentos_semanais',
    'auditoria_logs',
    'system_config'
  ] loop

    execute format(
      'drop policy if exists "anon_all_%s" on public.%I',
      t,
      t
    );

    execute format(
      'create policy "anon_all_%s"
       on public.%I
       for all
       to anon
       using (true)
       with check (true)',
      t,
      t
    );

  end loop;
end $$;

-- ============================================================
-- CONFIGURAÇÃO INICIAL
-- ============================================================

insert into public.system_config (
  salon_network_name,
  slogan
)
select
  'Bom Corte Salões',
  'Rede de Alta Performance & Gestão de Salões'
where not exists (
  select 1
  from public.system_config
);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

-- Deve retornar 0:
select count(*) as registros_com_cliente
from information_schema.columns
where table_schema = 'public'
  and table_name = 'registros_servicos'
  and column_name = 'client_name';

-- Deve retornar as tabelas principais:
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'filiais',
    'funcoes',
    'categorias_servicos',
    'servicos',
    'users',
    'registros_servicos',
    'vales',
    'pagamentos_semanais',
    'auditoria_logs',
    'system_config'
  )
order by table_name;

-- ============================================================
-- FIM
-- ============================================================
