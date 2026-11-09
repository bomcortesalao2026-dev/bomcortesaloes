import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User, Filial, Funcao, Servico,
  RegistroServico, Vale, PagamentoSemanal, AuditoriaLog, SystemConfig
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jieuhoyvccjgwflreczf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY.trim());
}

export function getSupabaseDbClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

// ============================================================
// HELPERS: Conversão camelCase <-> snake_case
// ============================================================
const CAMEL_TO_SNAKE: Record<string, string> = {
  filialId: 'filial_id', funcaoId: 'funcao_id', managerId: 'manager_id',
  vendedorId: 'vendedor_id', servicoId: 'servico_id',
  createdAt: 'created_at', updatedAt: 'updated_at', defaultPrice: 'default_price',
  commissionPercent: 'commission_percent',
  valorUnitario: 'valor_unitario', valorCobrado: 'valor_cobrado',
  valorComissao: 'valor_comissao', valorSalao: 'valor_salao',
  dataHora: 'data_hora', motivoReprovacao: 'motivo_reprovacao',
  justificativaReprovacao: 'justificativa_reprovacao',
  dataAprovacao: 'data_aprovacao', aprovadoPorId: 'aprovado_por_id',
  aprovadoPorNome: 'aprovado_por_nome', editHistory: 'edit_history',
  weeklyPaymentId: 'weekly_payment_id', notificacaoData: 'notificacao_data',
  notificacaoAutor: 'notificacao_autor', valorSolicitado: 'valor_solicitado',
  dataSolicitacao: 'data_solicitacao', observacaoAdmin: 'observacao_admin',
  semanaRef: 'semana_ref', periodoInicio: 'periodo_inicio',
  periodoFim: 'periodo_fim', servicosIds: 'servicos_ids',
  servicoIds: 'servico_ids', valesIds: 'vales_ids', valeIds: 'vale_ids',
  totalComissaoBruta: 'total_comissao_bruta', totalComissao: 'total_comissao',
  totalValesDescontados: 'total_vales_descontados',
  valesDescontados: 'vales_descontados',
  valorLiquidoPago: 'valor_liquido_pago', valorLiquido: 'valor_liquido',
  totalServicosCount: 'total_servicos_count',
  faturamentoRealizado: 'faturamento_realizado',
  outrosDescontos: 'outros_descontos', dataPagamento: 'data_pagamento',
  formaPagamento: 'forma_pagamento', pagoPorId: 'pago_por_id',
  pagoPorNome: 'pago_por_nome',
  usuarioId: 'usuario_id', usuarioNome: 'usuario_nome',
  usuarioRole: 'usuario_role', registroTipo: 'registro_tipo',
  registroId: 'registro_id', registroDescricao: 'registro_descricao',
  valorAnterior: 'valor_anterior', novoValor: 'novo_valor',
  salonNetworkName: 'salon_network_name', logoUrl: 'logo_url',
  logoType: 'logo_type', primaryColor: 'primary_color',
  autoApproveByManager: 'auto_approve_by_manager',
  closingDayOfWeek: 'closing_day_of_week',
  currencySymbol: 'currency_symbol',
  menuCustomizations: 'menu_customizations', passwordHash: 'password_hash'
};

const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k])
);

function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = CAMEL_TO_SNAKE[key] || key;
    result[snakeKey] = toSnake(obj[key]);
  }
  return result;
}

export function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = SNAKE_TO_CAMEL[key] || key;
    result[camelKey] = toCamel(obj[key]);
  }
  return result;
}

// ============================================================
// FILIAIS
// ============================================================
export async function dbGetFiliais(): Promise<Filial[]> {
  const { data, error } = await getSupabaseDbClient().from('filiais').select('*');
  if (error) throw error;
  return toCamel(data || []) as Filial[];
}

export async function dbSaveFilial(filial: Filial): Promise<void> {
  const { error } = await getSupabaseDbClient().from('filiais').upsert(toSnake(filial), { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteFilial(id: string): Promise<void> {
  const { error } = await getSupabaseDbClient().from('filiais').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// CATEGORIAS DE SERVIÇOS
// ============================================================
export async function dbGetCategorias(): Promise<any[]> {
  const { data, error } = await getSupabaseDbClient().from('categorias_servicos').select('*');
  if (error) throw error;
  return toCamel(data || []) as any[];
}

export async function dbSaveCategoria(categoria: any): Promise<void> {
  const { error } = await getSupabaseDbClient()
    .from('categorias_servicos')
    .upsert(toSnake(categoria), { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteCategoria(id: string): Promise<void> {
  const { error } = await getSupabaseDbClient().from('categorias_servicos').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// FUNCOES
// ============================================================
export async function dbGetFuncoes(): Promise<Funcao[]> {
  const { data, error } = await getSupabaseDbClient().from('funcoes').select('*');
  if (error) throw error;
  return toCamel(data || []) as Funcao[];
}

export async function dbSaveFuncao(funcao: Funcao): Promise<void> {
  const { error } = await getSupabaseDbClient().from('funcoes').upsert(toSnake(funcao), { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteFuncao(id: string): Promise<void> {
  const { error } = await getSupabaseDbClient().from('funcoes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================

export async function dbGetServicos(): Promise<Servico[]> {
  const { data, error } = await getSupabaseDbClient().from('servicos').select('*');
  if (error) throw error;
  return toCamel(data || []) as Servico[];
}

export async function dbSaveServico(s: Servico): Promise<void> {
  const { error } = await getSupabaseDbClient().from('servicos').upsert(toSnake(s), { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteServico(id: string): Promise<void> {
  const { error } = await getSupabaseDbClient().from('servicos').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// USERS
// ============================================================
export async function dbGetUsers(): Promise<User[]> {
  const { data, error } = await getSupabaseDbClient().from('users').select('*');
  if (error) throw error;
  return toCamel(data || []) as User[];
}

export async function dbSaveUsers(users: User[]): Promise<void> {
  if (!users.length) return;
  const { error } = await getSupabaseDbClient().from('users').upsert(users.map(toSnake), { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteUser(id: string): Promise<void> {
  const { error } = await getSupabaseDbClient().from('users').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// REGISTROS DE SERVICOS
// ============================================================
export async function dbGetRegistrosServicos(): Promise<RegistroServico[]> {
  const { data, error } = await getSupabaseDbClient().from('registros_servicos').select('*');
  if (error) throw error;
  return toCamel(data || []) as RegistroServico[];
}

export async function dbSaveRegistrosServicos(list: RegistroServico[]): Promise<void> {
  if (!list.length) return;
  const { error } = await getSupabaseDbClient().from('registros_servicos').upsert(list.map(toSnake), { onConflict: 'id' });
  if (error) throw error;
}

// ============================================================
// VALES
// ============================================================
export async function dbGetVales(): Promise<Vale[]> {
  const { data, error } = await getSupabaseDbClient().from('vales').select('*');
  if (error) throw error;
  return toCamel(data || []) as Vale[];
}

export async function dbSaveVales(list: Vale[]): Promise<void> {
  if (!list.length) return;
  const { error } = await getSupabaseDbClient().from('vales').upsert(list.map(toSnake), { onConflict: 'id' });
  if (error) throw error;
}

// ============================================================
// PAGAMENTOS
// ============================================================
export async function dbGetPagamentos(): Promise<PagamentoSemanal[]> {
  const { data, error } = await getSupabaseDbClient().from('pagamentos_semanais').select('*');
  if (error) throw error;
  return toCamel(data || []) as PagamentoSemanal[];
}

export async function dbSavePagamentos(list: PagamentoSemanal[]): Promise<void> {
  if (!list.length) return;
  const { error } = await getSupabaseDbClient().from('pagamentos_semanais').upsert(list.map(toSnake), { onConflict: 'id' });
  if (error) throw error;
}

// ============================================================
// AUDITORIA
// ============================================================
export async function dbGetAuditoria(): Promise<AuditoriaLog[]> {
  const { data, error } = await getSupabaseDbClient()
    .from('auditoria_logs').select('*')
    .order('data_hora', { ascending: false }).limit(500);
  if (error) throw error;
  return toCamel(data || []) as AuditoriaLog[];
}

export async function dbSaveAuditoria(list: AuditoriaLog[]): Promise<void> {
  const last500 = list.slice(0, 500);
  if (!last500.length) return;
  const { error } = await getSupabaseDbClient().from('auditoria_logs').upsert(
    last500.map(toSnake),
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

// ============================================================
// SYSTEM CONFIG (inclui customizações de ícones)
// ============================================================
export async function dbGetConfig(): Promise<SystemConfig> {
  const { data, error } = await getSupabaseDbClient().from('system_config').select('*').maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      salonNetworkName: 'Bom Corte Salões',
      slogan: 'Rede de Alta Performance & Gestão de Salões',
      primaryColor: '#C8A45D',
      autoApproveByManager: true,
      closingDayOfWeek: 'Segunda-feira',
      currencySymbol: 'R$',
      menuCustomizations: {}
    };
  }
  const camel = toCamel(data) as any;
  return {
    salonNetworkName: camel.salonNetworkName || camel.salon_network_name || 'Bom Corte Salões',
    logoUrl: camel.logoUrl,
    logoType: camel.logoType,
    slogan: camel.slogan || 'Rede de Alta Performance & Gestão de Salões',
    primaryColor: camel.primaryColor || '#C8A45D',
    autoApproveByManager: camel.autoApproveByManager !== false,
    closingDayOfWeek: camel.closingDayOfWeek || 'Segunda-feira',
    currencySymbol: camel.currencySymbol || 'R$',
    menuCustomizations: camel.menuCustomizations || {}
  };
}

export async function dbSaveConfig(config: SystemConfig): Promise<void> {
  const snake = {
    salon_network_name: config.salonNetworkName,
    logo_url: config.logoUrl || null,
    logo_type: config.logoType || 'image',
    slogan: config.slogan,
    primary_color: config.primaryColor,
    auto_approve_by_manager: config.autoApproveByManager,
    closing_day_of_week: config.closingDayOfWeek,
    currency_symbol: config.currencySymbol,
    menu_customizations: config.menuCustomizations || {},
    updated_at: new Date().toISOString()
  };
  const existing = await getSupabaseDbClient().from('system_config').select('id').maybeSingle();
  if (existing.data) {
    const { error } = await getSupabaseDbClient().from('system_config').update(snake).eq('id', existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await getSupabaseDbClient().from('system_config').insert(snake);
    if (error) throw error;
  }
}

export async function dbRestoreBackupData(backup: {
  usuarios: User[];
  filiais: Filial[];
  funcoes: Funcao[];
  servicos: Servico[];
  registrosServicos: RegistroServico[];
  vales: Vale[];
  pagamentos: PagamentoSemanal[];
  auditoria: AuditoriaLog[];
  config: SystemConfig;
}): Promise<void> {
  const client = getSupabaseDbClient();
  const tablesToClear = [
    'auditoria_logs', 'pagamentos_semanais', 'vales', 'registros_servicos',
    'users', 'servicos', 'funcoes', 'filiais',
  ];

  for (const table of tablesToClear) {
    const { error } = await client.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }

  const restoreRows = async (table: string, rows: object[]) => {
    if (rows.length === 0) return;
    const { error } = await client.from(table).upsert(rows.map(toSnake), { onConflict: 'id' });
    if (error) throw error;
  };

  await restoreRows('filiais', backup.filiais);
  await restoreRows('funcoes', backup.funcoes);
  await restoreRows('users', backup.usuarios);
  await restoreRows('servicos', backup.servicos);
  await restoreRows('registros_servicos', backup.registrosServicos);
  await restoreRows('vales', backup.vales);
  await restoreRows('pagamentos_semanais', backup.pagamentos);
  await restoreRows('auditoria_logs', backup.auditoria);
  await dbSaveConfig(backup.config);
}

// ============================================================
// SEED: Migrar dados do localStorage para o Supabase (1ª vez)
// ============================================================
export async function dbSeedFromLocalStorage(storageService: any): Promise<void> {
  const supabaseFiliais = await dbGetFiliais();
  if (supabaseFiliais.length === 0) {
    const localFiliais = storageService.getFiliais();
    for (const f of localFiliais) await dbSaveFilial(f);
    console.log(`[Supabase Seed] ${localFiliais.length} filiais migradas`);
  }
  const supabaseFuncoes = await dbGetFuncoes();
  if (supabaseFuncoes.length === 0) {
    const local = storageService.getFuncoes();
    for (const item of local) await dbSaveFuncao(item);
    console.log(`[Supabase Seed] ${local.length} funções migradas`);
  }
  const supabaseCats = await dbGetCategorias();
  if (supabaseCats.length === 0) {
    const local = storageService.getCategorias();
    for (const item of local) await dbSaveCategoria(item);
    console.log(`[Supabase Seed] ${local.length} categorias migradas`);
  }
  const supabaseServicos = await dbGetServicos();
  if (supabaseServicos.length === 0) {
    const local = storageService.getServicos();
    for (const item of local) await dbSaveServico(item);
    console.log(`[Supabase Seed] ${local.length} serviços migrados`);
  }
  const supabaseUsers = await dbGetUsers();
  if (supabaseUsers.length === 0) {
    const local = storageService.getUsers();
    await dbSaveUsers(local);
    console.log(`[Supabase Seed] ${local.length} usuários migrados`);
  }
  const supabaseRegistros = await dbGetRegistrosServicos();
  if (supabaseRegistros.length === 0) {
    const local = storageService.getRegistrosServicos();
    await dbSaveRegistrosServicos(local);
    console.log(`[Supabase Seed] ${local.length} registros migrados`);
  }
  const supabaseVales = await dbGetVales();
  if (supabaseVales.length === 0) {
    const local = storageService.getVales();
    await dbSaveVales(local);
    console.log(`[Supabase Seed] ${local.length} vales migrados`);
  }
  const supabasePag = await dbGetPagamentos();
  if (supabasePag.length === 0) {
    const local = storageService.getPagamentos();
    await dbSavePagamentos(local);
    console.log(`[Supabase Seed] ${local.length} pagamentos migrados`);
  }
  const supabaseAud = await dbGetAuditoria();
  if (supabaseAud.length === 0) {
    const local = storageService.getAuditoria();
    await dbSaveAuditoria(local);
    console.log(`[Supabase Seed] ${local.length} logs de auditoria migrados`);
  }
}

export async function dbClearAllHistory(): Promise<void> {
  const client = getSupabaseDbClient();
  for (const table of ['registros_servicos', 'vales', 'pagamentos_semanais', 'auditoria_logs']) {
    const { error } = await client.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }
}

export async function dbCleanHistoryForNewCycle(
  keepRegistroIds: string[],
  keepValeIds: string[]
): Promise<void> {
  const client = getSupabaseDbClient();

  // 1. Registros_servicos: apaga tudo EXCETO os IDs mantidos (PENDENTE / APROVADO)
  if (keepRegistroIds.length === 0) {
    await client.from('registros_servicos').delete().not('id', 'is', null);
  } else {
    await client.from('registros_servicos').delete().not('id', 'in', `(${keepRegistroIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`);
  }

  // 2. Vales: apaga tudo EXCETO os IDs mantidos (PENDENTE / APROVADO)
  if (keepValeIds.length === 0) {
    await client.from('vales').delete().not('id', 'is', null);
  } else {
    await client.from('vales').delete().not('id', 'in', `(${keepValeIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`);
  }

  // 3. Pagamentos_semanais: PRESERVAR TUDO (histórico de liquidações financeiras)
  // (NÃO apagar mais — registros são a base do módulo de pagamentos efetuados)

  // 4. Auditoria_logs: PRESERVAR (trilha de auditoria)
  // (NÃO apagar mais — mantém histórico de ações administrativas)
}