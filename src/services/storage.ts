import {
  User, Filial, Funcao, Servico, RegistroServico, Vale, PagamentoSemanal, AuditoriaLog, SystemConfig, UserRole, VendedorSaldoNegativo
} from '../types';
import { getPreviousWeekCycle, getEffectiveNow } from '../utils/dateCycleUtils';
import {
  dbGetFiliais, dbSaveFilial, dbDeleteFilial,
  dbGetFuncoes, dbSaveFuncao, dbDeleteFuncao,
  dbGetCategorias, dbSaveCategoria, dbDeleteCategoria,
  dbGetServicos, dbSaveServico, dbDeleteServico,
  dbGetUsers, dbSaveUsers, dbDeleteUser,
  dbGetRegistrosServicos, dbSaveRegistrosServicos,
  dbGetVales, dbSaveVales,
  dbGetPagamentos, dbSavePagamentos,
  dbGetAuditoria, dbSaveAuditoria,
  dbGetConfig, dbSaveConfig,
  dbRestoreBackupData,
  getSupabaseDbClient,
  isSupabaseConfigured,
  toCamel,
  dbClearAllHistory,
  dbCleanHistoryForNewCycle
} from './supabaseDatabase';

const SYNC_KEYS = {
  LAST_SYNC_FILIAIS: 'nexus_sync_filiais',
  LAST_SYNC_FUNCOES: 'nexus_sync_funcoes',
  LAST_SYNC_CATEGORIAS: 'nexus_sync_categorias',
  LAST_SYNC_SERVICOS: 'nexus_sync_servicos',
  LAST_SYNC_USERS: 'nexus_sync_users',
  LAST_SYNC_REGISTROS: 'nexus_sync_registros',
  LAST_SYNC_VALES: 'nexus_sync_vales',
  LAST_SYNC_PAGAMENTOS: 'nexus_sync_pagamentos',
  LAST_SYNC_AUDITORIA: 'nexus_sync_auditoria',
  LAST_SYNC_CONFIG: 'nexus_sync_config',
  SEED_COMPLETED: 'nexus_seed_completed_v1'
};

// =====================================================================
// VERSÃO DE LIMPEZA — mude este número sempre que quiser forçar
// a remoção de dados antigos/demo do localStorage de todos os navegadores.
// =====================================================================
const CLEANUP_VERSION = 'v3-sem-demo-2026';

let _useSupabase: boolean = true;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function canUseSupabase(): boolean {
  return _useSupabase && isOnline() && isSupabaseConfigured();
}

async function safeDbCall<T>(fn: () => Promise<T>, fallback: T, logName: string): Promise<T> {
  if (!canUseSupabase()) return fallback;
  try { return await fn(); }
  catch (err) {
    console.warn(`[Supabase] Falha em ${logName}, usando localStorage:`, err);
    _useSupabase = false;
    setTimeout(() => { _useSupabase = true; }, 30000);
    return fallback;
  }
}

const STORAGE_KEYS = {
  USERS: 'nexus_salon_users',
  FILIAIS: 'nexus_salon_filiais',
  FUNCOES: '@bomcorte_funcoes',
  SERVICOS: '@bomcorte_servicos',
  REGISTROS_SERVICOS: 'nexus_salon_registros_servicos',
  VALES: 'nexus_salon_vales',
  PAGAMENTOS: 'nexus_salon_pagamentos',
  AUDITORIA: 'nexus_salon_auditoria',
  CONFIG: 'nexus_salon_config',
  CURRENT_USER: 'nexus_salon_current_user',
  HISTORY_ZEROED_V1: 'nexus_salon_history_zeroed_v1',
  PENDING_REGISTROS: 'nexus_pending_sync_registros',
  PENDING_VALES: 'nexus_pending_sync_vales',
  PENDING_PAGAMENTOS: 'nexus_pending_sync_pagamentos',
  SALDOS_NEGATIVOS: 'nexus_saldos_negativos',
  CYCLE_OVERRIDES: 'nexus_cycle_overrides',
  LAST_CYCLE_CLEANUP: 'nexus_last_cycle_cleanup_period',
};

// --- Rastreamento de gravações ainda não confirmadas no Supabase ---
// A gravação no banco é assíncrona ("dispara e esquece"). Sem isso, um refresh
// (polling, foco de janela ou recarregamento de página) que buscasse dados do
// Supabase ANTES da gravação terminar sobrescreveria o cache local e o registro
// recém-criado "sumiria" da tela sem nunca ter sido reprovado/apagado por ninguém.
function getPendingIds(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function addPendingIds(key: string, ids: string[]) {
  if (ids.length === 0) return;
  const cur = new Set(getPendingIds(key));
  ids.forEach(id => cur.add(id));
  localStorage.setItem(key, JSON.stringify(Array.from(cur)));
}
function removePendingIds(key: string, ids: string[]) {
  if (ids.length === 0) return;
  const cur = new Set(getPendingIds(key));
  ids.forEach(id => cur.delete(id));
  localStorage.setItem(key, JSON.stringify(Array.from(cur)));
}
// Combina a lista vinda do Supabase com qualquer item local que ainda não foi
// confirmado como gravado (mantém o item local nesse caso, em vez de perdê-lo).
function mergeWithPending<T extends { id: string }>(remoteList: T[], pendingKey: string, localStorageKey: string): T[] {
  const pendingIds = getPendingIds(pendingKey);
  if (pendingIds.length === 0) return remoteList;
  let localList: T[] = [];
  try { localList = JSON.parse(localStorage.getItem(localStorageKey) || '[]'); } catch { localList = []; }
  const remoteIds = new Set(remoteList.map(r => r.id));
  const merged = [...remoteList];
  for (const local of localList) {
    if (pendingIds.includes(local.id) && !remoteIds.has(local.id)) {
      merged.unshift(local);
    }
  }
  return merged;
}

// Seed vazio — nenhum dado de demonstração é pré-carregado.
// Todos os cadastros (filiais, funções, serviços, funcionários) devem ser feitos pelo administrador.
const SEED_FILIAIS: Filial[] = [];
const SEED_FUNCOES: Funcao[] = [];
const SEED_SERVICOS: Servico[] = [];
const SEED_USERS: User[] = [];

const SEED_REGISTROS: RegistroServico[] = [];
const SEED_VALES: Vale[] = [];
const SEED_AUDITORIA: AuditoriaLog[] = [];

const DEFAULT_CONFIG: SystemConfig = {
  salonNetworkName: 'Bom Corte Salões',
  slogan: 'Rede de Alta Performance & Gestão de Salões',
  primaryColor: '#C8A45D',
  autoApproveByManager: true,
  closingDayOfWeek: 'Segunda-feira',
  currencySymbol: 'R$',
  menuCustomizations: {},
  backupEnabled: true,
  backupFrequency: 'SEMANAL',
  lastBackupAt: '',
  nextBackupAt: '',
};

export interface FechamentoStatus {
  totalVendedoresAtivos: number;
  pagos: { userId: string; userName: string; valorPago: number }[];
  saldoNegativo: { userId: string; userName: string; valorDevido: number; saldoId: string }[];
  naoPagos: { userId: string; userName: string; totalComissao: number }[];
  todosPagos: boolean;
  periodoAnteriorInicio: string;
  periodoAnteriorFim: string;
}

export class StorageService {
  private static _initRunning: boolean = false;
  private static _initDone: boolean = false;

  static async init(): Promise<void> {
    if (this._initDone || this._initRunning) return;
    this._initRunning = true;

    // ================================================================
    // LIMPEZA FORÇADA: remove todos os dados de demonstração.
    // Se a versão de limpeza mudou, apaga tudo do localStorage.
    // ================================================================
    const DEMO_IDS = [
      'user-admin-1', 'admin-central-01',
      'gerente-1', 'gerente-2',
      'user-vendedor-1', 'user-vendedor-2', 'user-vendedor-3', 'user-vendedor-4',
      'filial-1', 'filial-2', 'filial-3',
      'func-1', 'func-2', 'func-3', 'func-4', 'func-5',
      'svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5', 'svc-6', 'svc-7', 'svc-8', 'svc-9',
    ];

    const cleanupDone = localStorage.getItem('nexus_cleanup_version') === CLEANUP_VERSION;
    if (!cleanupDone) {
      console.log('[Init] Executando limpeza forçada de dados de demonstração (versão:', CLEANUP_VERSION, ')...');
      // Remove dados de demo do localStorage
      for (const key of [STORAGE_KEYS.USERS, STORAGE_KEYS.FILIAIS, STORAGE_KEYS.FUNCOES, STORAGE_KEYS.SERVICOS]) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: any[] = JSON.parse(raw);
            const cleaned = list.filter((item: any) => !DEMO_IDS.includes(item.id));
            localStorage.setItem(key, JSON.stringify(cleaned));
            if (list.length !== cleaned.length)
              console.log(`[Init] Removidos ${list.length - cleaned.length} item(s) de demo de '${key}'.`);
          }
        } catch { /* ignore */ }
      }
      // Se o usuário logado era demo, faz logout
      try {
        const session = this.getCurrentUser();
        if (session && DEMO_IDS.includes(session.id)) this.setCurrentUser(null);
      } catch { /* ignore */ }
      // Também remove do Supabase assincronamente (sem bloquear o boot)
      if (canUseSupabase()) {
        (async () => {
          try {
            const db = getSupabaseDbClient();
            // Limpeza em lote: no primeiro acesso de uma versão nova,
            // evita dezenas/centenas de DELETEs individuais.
            await db.from('registros_servicos').delete().in('vendedor_id', DEMO_IDS);
            await db.from('vales').delete().in('vendedor_id', DEMO_IDS);
            await db.from('users').delete().in('id', DEMO_IDS);
            await db.from('filiais').delete().in('id', DEMO_IDS);
            await db.from('funcoes').delete().in('id', DEMO_IDS);
            await db.from('servicos').delete().in('id', DEMO_IDS);
            console.log('[Init] Dados de demo removidos do Supabase.');
          } catch (e) { console.warn('[Init] Falha ao remover demo do Supabase:', e); }
        })();
      }
      // Marca a limpeza como concluída nesta versão
      localStorage.setItem('nexus_cleanup_version', CLEANUP_VERSION);
      // Marca seed como concluído para nunca enviar dados fictícios ao Supabase
      localStorage.setItem(SYNC_KEYS.SEED_COMPLETED, 'true');
      console.log('[Init] Limpeza concluída.');
    }

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.FILIAIS)) localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.FUNCOES)) localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.SERVICOS)) localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY_ZEROED_V1)) {
      localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.HISTORY_ZEROED_V1, 'true');
    } else {
      if (!localStorage.getItem(STORAGE_KEYS.REGISTROS_SERVICOS)) localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.VALES)) localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.PAGAMENTOS)) localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.AUDITORIA)) localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify([]));
    }
    if (!localStorage.getItem(SYNC_KEYS.SEED_COMPLETED)) {
      localStorage.setItem(SYNC_KEYS.SEED_COMPLETED, 'true');
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALDOS_NEGATIVOS)) {
      localStorage.setItem(STORAGE_KEYS.SALDOS_NEGATIVOS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CYCLE_OVERRIDES)) {
      localStorage.setItem(STORAGE_KEYS.CYCLE_OVERRIDES, JSON.stringify([]));
    }

    if (canUseSupabase()) {
      try {
        // Busca todos os dados do Supabase (fonte de verdade)
        const [f, fu, s, u, r, v, p, a, cfg] = await Promise.all([
          safeDbCall(() => dbGetFiliais(), JSON.parse(localStorage.getItem(STORAGE_KEYS.FILIAIS) || '[]'), 'getFiliais'),
          safeDbCall(() => dbGetFuncoes(), JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCOES) || '[]'), 'getFuncoes'),
          safeDbCall(() => dbGetServicos(), JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]'), 'getServicos'),
          safeDbCall(() => dbGetUsers(), JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'), 'getUsers'),
          safeDbCall(() => dbGetRegistrosServicos(), JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS_SERVICOS) || '[]'), 'getRegistros'),
          safeDbCall(() => dbGetVales(), JSON.parse(localStorage.getItem(STORAGE_KEYS.VALES) || '[]'), 'getVales'),
          safeDbCall(() => dbGetPagamentos(), JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGAMENTOS) || '[]'), 'getPagamentos'),
          safeDbCall(() => dbGetAuditoria(), JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDITORIA) || '[]'), 'getAuditoria'),
          safeDbCall(() => dbGetConfig(), JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG)), 'getConfig'),
        ]);
        // Supabase é a fonte de verdade: salva os dados do banco no cache local
        localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(f));
        localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(fu));
        localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(s));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(u));
        localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(mergeWithPending<RegistroServico>(r, STORAGE_KEYS.PENDING_REGISTROS, STORAGE_KEYS.REGISTROS_SERVICOS)));
        localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(mergeWithPending<Vale>(v, STORAGE_KEYS.PENDING_VALES, STORAGE_KEYS.VALES)));
        localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(p));
        if (a.length > 0) localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(a));
        if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cfg));
        }
        console.log('[Supabase] Cache sincronizado com sucesso.');
        if (typeof window !== 'undefined') {
          try {
                            window.dispatchEvent(new CustomEvent('nexus_supabase_sync_complete'));
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.warn('[Supabase] Sincronização inicial falhou, usando cache local:', err);
      }
    }

    // Reparo automático: Reconstruir PagamentoSemanal para serviços PAGO sem histórico
    try {
      const recriados = this.repararPagamentosPerdidos();
      if (recriados > 0) {
        console.log(`[Storage/Reparo] ${recriados} pagamento(s) reconstruído(s) a partir de serviços PAGO.`);
      }
    } catch (e) {
      console.warn('[Storage/Reparo] Falha na recuperação de pagamentos:', e);
    }

    this._initDone = true;
    this._initRunning = false;
  }

  // Sincronização orientada a eventos: não existe polling periódico.
  // O Supabase Realtime avisa quando uma tabela realmente mudou.
  private static _realtimeChannel: any = null;

  static setupRealtimeSubscriptions() {
    if (!canUseSupabase() || this._realtimeChannel) return;

    const supabase = getSupabaseDbClient();

    const applyRealtimeChange = (table: string, payload: any) => {
      try {
        const storageKeyByTable: Record<string, string> = {
          registros_servicos: STORAGE_KEYS.REGISTROS_SERVICOS,
          vales: STORAGE_KEYS.VALES,
          pagamentos_semanais: STORAGE_KEYS.PAGAMENTOS,
          users: STORAGE_KEYS.USERS,
          filiais: STORAGE_KEYS.FILIAIS,
          funcoes: STORAGE_KEYS.FUNCOES,
          servicos: STORAGE_KEYS.SERVICOS,
        };
        const storageKey = storageKeyByTable[table];
        if (!storageKey) return;

        const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const event = payload?.eventType;
        const row = payload?.new;
        const oldRow = payload?.old;
        const rowId = row?.id ?? oldRow?.id;
        if (!rowId) return;

        if (event === 'DELETE') {
          localStorage.setItem(
            storageKey,
            JSON.stringify(current.filter((item: any) => item?.id !== rowId))
          );
        } else {
          const nextItem = toCamel(row);
          const index = current.findIndex((item: any) => item?.id === rowId);
          if (index >= 0) current[index] = { ...current[index], ...nextItem };
          else current.push(nextItem);
          localStorage.setItem(storageKey, JSON.stringify(current));
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_realtime_data_updated', { detail: { table } }));
        }

              } catch (e) {
        console.warn(`[Realtime] Falha ao aplicar evento de ${table}:`, e);
      }
    };

    const channel = supabase.channel('bomcorte-data-changes');

    for (const table of [
      'registros_servicos',
      'vales',
      'pagamentos_semanais',
      'users',
      'filiais',
      'funcoes',
      'servicos'
    ]) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: any) => applyRealtimeChange(table, payload)
      );
    }

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Inscrição ativa; sincronização orientada por eventos.');
      }
    });

    this._realtimeChannel = channel;
  }

  static async clearAllHistory(currentUser?: User): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de apagar o histórico. Nenhum dado foi apagado.');
    }

    if (!canUseSupabase()) {
      throw new Error('Não foi possível confirmar a conexão com o banco online. O histórico não foi apagado; verifique a conexão e tente novamente.');
    }

    await dbClearAllHistory();

    localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PENDING_REGISTROS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PENDING_VALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PENDING_PAGAMENTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HISTORY_ZEROED_V1, 'true');
    localStorage.setItem('nexus_registros_servicos', JSON.stringify([]));
    localStorage.setItem('nexus_vales', JSON.stringify([]));
    localStorage.setItem('nexus_pagamentos_semanais', JSON.stringify([]));
    localStorage.setItem('nexus_notificacoes_pedidos', JSON.stringify([]));
    localStorage.setItem('nexus_pedidos_lidos', JSON.stringify([]));
    if (currentUser) {
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Limpeza de Histórico', registroTipo: 'CONFIG', registroId: 'history-cleared',
        registroDescricao: 'Todo o histórico de atendimentos, vales, pagamentos e logs foi zerado com sucesso.',
      });
    }
    window.dispatchEvent(new CustomEvent('nexus_reset_historico'));
  }

  static limparHistoricoAoIniciarNovoCiclo(
    prevStart: string,
    prevEnd: string,
    currentUser: User
  ): { limpou: boolean; motivoSkip?: string; resumo?: {
    registrosApagados: number; registrosMantidos: number;
    valesApagados: number; valesMantidos: number;
    pagamentosApagados: number; saldosNegativosMantidos: number;
  } } {
    const guardKey = `${prevStart}__${prevEnd}`;
    const lastCleaned = localStorage.getItem(STORAGE_KEYS.LAST_CYCLE_CLEANUP);
    if (lastCleaned === guardKey) {
      return { limpou: false, motivoSkip: `Já foi feita limpeza para o período ${guardKey}.` };
    }

    const todosRegistros = this.getRegistrosServicos();
    const todosVales = this.getVales();
    const todosPagamentos = this.getPagamentos();
    const saldosNegativos = this.getSaldosNegativos();

    // ================================
    // REGRAS DE MANUTENÇÃO:
    // ================================
    // ✓ MANTER registros_servicos com status = 'PENDENTE' ou 'APROVADO'
    //   (ainda não foram aprovados / ainda não foram pagos / pendentes de pagamento)
    // ✗ APAGAR registros com status = 'PAGO' ou 'REPROVADO' (já resolvidos)
    // ================================
    const registrosParaManter = todosRegistros.filter(r =>
      r.status === 'PENDENTE' || r.status === 'APROVADO'
    );
    const registrosParaManterIds = registrosParaManter.map(r => r.id);

    // ================================
    // ✓ MANTER vales com status = 'PENDENTE' ou 'APROVADO'
    //   (ainda não resolvidos)
    // ✗ APAGAR vales com status = 'PAGO', 'REPROVADO' ou 'DESCONTADO'
    // ================================
    const valesParaManter = todosVales.filter(v =>
      v.status === 'PENDENTE' || v.status === 'APROVADO'
    );
    const valesParaManterIds = valesParaManter.map(v => v.id);

    // ================================
    // ✓ MANTER pagamentos_semanais TUDO
    //   (HISTÓRICO DE LIQUIDAÇÕES = NUNCA APAGAR)
    // ================================
    const pagamentosParaManter = todosPagamentos;

    // ================================
    // ✓ MANTER VendedorSaldoNegativo ONDE quitado = false
    //   (dívidas ativas do profissional)
    // ================================
    const saldosAtivos = saldosNegativos.filter(s => !s.quitado);

    const resumo = {
      registrosApagados: todosRegistros.length - registrosParaManter.length,
      registrosMantidos: registrosParaManter.length,
      valesApagados: todosVales.length - valesParaManter.length,
      valesMantidos: valesParaManter.length,
      pagamentosApagados: 0,
      pagamentosMantidos: pagamentosParaManter.length,
      saldosNegativosMantidos: saldosAtivos.length,
    };

    // Aplicar no localStorage
    localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(registrosParaManter));
    localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(valesParaManter));
    localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(pagamentosParaManter));
    // Auditoria é limpa abaixo, DEPOIS preenchemos com o log da própria limpeza
    localStorage.setItem(STORAGE_KEYS.SALDOS_NEGATIVOS, JSON.stringify(saldosAtivos));
    localStorage.setItem(STORAGE_KEYS.LAST_CYCLE_CLEANUP, guardKey);
    localStorage.setItem(STORAGE_KEYS.HISTORY_ZEROED_V1, 'true');
    localStorage.setItem('nexus_pagamentos_semanais', JSON.stringify([]));
    localStorage.setItem('nexus_notificacoes_pedidos', JSON.stringify([]));
    localStorage.setItem('nexus_pedidos_lidos', JSON.stringify([]));

    // Limpar pending sync ids que NÃO estão mais na lista
    const pendingRegistros = getPendingIds(STORAGE_KEYS.PENDING_REGISTROS).filter(id => registrosParaManterIds.includes(id));
    const pendingVales = getPendingIds(STORAGE_KEYS.PENDING_VALES).filter(id => valesParaManterIds.includes(id));
    localStorage.setItem(STORAGE_KEYS.PENDING_REGISTROS, JSON.stringify(pendingRegistros));
    localStorage.setItem(STORAGE_KEYS.PENDING_VALES, JSON.stringify(pendingVales));

    if (canUseSupabase()) {
      dbCleanHistoryForNewCycle(registrosParaManterIds, valesParaManterIds)
        .catch((e) => console.warn('[Supabase] Erro ao limpar ciclo remoto:', e));
    }

    // Auditoria: agora que o storage está limpo, criamos UM ÚNICO log da limpeza
    // e o gravamos DIRETAMENTE (sem passar pelo logAuditoria que lê antes de gravar)
    const agoraISO = new Date().toISOString();
    const auditoriaCleanup: AuditoriaLog = {
      id: 'log-' + agoraISO.replace(/[^0-9]/g, '') + '-' + Math.random().toString(36).slice(2, 6),
      dataHora: agoraISO,
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Limpeza Automática de Ciclo (Novo Ciclo Iniciado)',
      registroTipo: 'SISTEMA',
      registroId: `cycle-clean-${guardKey}-${Date.now().toString(36)}`,
      registroDescricao: `Limpeza ao iniciar novo ciclo (${prevStart} a ${prevEnd})`,
      valorAnterior: `Registros=${todosRegistros.length}, Vales=${todosVales.length}, Pagamentos=${todosPagamentos.length}, Saldos Negativos ativos=${saldosAtivos.length}`,
      novoValor: `Mantidos: Registros=${registrosParaManter.length}, Vales=${valesParaManter.length}, Pagamentos=${pagamentosParaManter.length} (histórico preservado), SaldosNegativos=${saldosAtivos.length}`,
      detalhes: `Apagados ${resumo.registrosApagados} atendimentos (PAGO/REPROVADO), ${resumo.valesApagados} vales (PAGO/REPROVADO/DESCONTADO). Pagamentos semanais (histórico) PRESERVADOS (${resumo.pagamentosMantidos} registros). Mantidos ${resumo.registrosMantidos} atendimentos pendentes/aprovados, ${resumo.valesMantidos} vales pendentes/aprovados e ${resumo.saldosNegativosMantidos} saldos negativos ativos.`,
    };
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify([auditoriaCleanup]));
    if (canUseSupabase()) {
      dbSaveAuditoria([auditoriaCleanup]).catch((e) => console.warn('[Supabase] saveAuditoria (cleanup log) falhou:', e));
    }

    window.dispatchEvent(new CustomEvent('nexus_cycle_cleanup_done', { detail: resumo }));

    return { limpou: true, resumo };
  }

  private static normalizeLegacyIdsForUsers(users: User[]): User[] {
    const next = users.map(u => ({ ...u }));
    const existingVendorCodes = next
      .filter(u => u.role === 'VENDEDOR' && /^F\d+$/i.test(String(u.id)))
      .map(u => Number(String(u.id).replace(/\D/g, '')))
      .filter(n => Number.isFinite(n));
    let vendorSequence = existingVendorCodes.length > 0 ? Math.max(...existingVendorCodes) : 0;
    const vendorSet = new Set(next.filter(u => u.role === 'VENDEDOR').map(u => String(u.id).toUpperCase()));

    next.forEach((user) => {
      if (user.role !== 'VENDEDOR') return;
      const id = String(user.id);
      if (/^F\d+$/i.test(id)) return;
      if (/^(user-)?vendedor-\d+$/i.test(id) || /^vendedor-\d+$/i.test(id)) {
        let candidate = `F${String(vendorSequence + 1).padStart(2, '0')}`;
        let attempt = vendorSequence + 1;
        while (vendorSet.has(candidate)) {
          attempt += 1;
          candidate = `F${String(attempt).padStart(2, '0')}`;
        }
        vendorSet.add(candidate);
        vendorSequence = attempt;
        user.id = candidate;
      }
    });

    const existingGerenteCodes = next
      .filter(u => u.role === 'GERENTE' && /^G\d+$/i.test(String(u.id)))
      .map(u => Number(String(u.id).replace(/\D/g, '')))
      .filter(n => Number.isFinite(n));
    let gerenteSequence = existingGerenteCodes.length > 0 ? Math.max(...existingGerenteCodes) : 0;
    const gerenteSet = new Set(next.filter(u => u.role === 'GERENTE').map(u => String(u.id).toUpperCase()));

    next.forEach((user) => {
      if (user.role !== 'GERENTE') return;
      const id = String(user.id);
      if (/^G\d+$/i.test(id)) return;
      if (/^gerente-\d+$/i.test(id) || /^user-gerente-\d+$/i.test(id)) {
        let candidate = `G${String(gerenteSequence + 1).padStart(2, '0')}`;
        let attempt = gerenteSequence + 1;
        while (gerenteSet.has(candidate)) {
          attempt += 1;
          candidate = `G${String(attempt).padStart(2, '0')}`;
        }
        gerenteSet.add(candidate);
        gerenteSequence = attempt;
        user.id = candidate;
      }
    });

    return next;
  }

  private static normalizeLegacyIdsForCatalog<T extends { id: string }>(items: T[], prefix: string): T[] {
    const next = items.map(item => ({ ...item }));
    const existingCodes = next
      .filter(item => new RegExp(`^${prefix}\\d+$`, 'i').test(String(item.id)))
      .map(item => Number(String(item.id).replace(/\D/g, '')))
      .filter(n => Number.isFinite(n));
    let sequence = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const seen = new Set(next.map(item => String(item.id).toUpperCase()));

    next.forEach((item) => {
      const id = String(item.id);
      if (new RegExp(`^${prefix}\\d+$`, 'i').test(id)) return;
      if (/^(func|svc|serv)-\d+$/i.test(id)) {
        let candidate = `${prefix}${String(sequence + 1).padStart(2, '0')}`;
        let attempt = sequence + 1;
        while (seen.has(candidate)) {
          attempt += 1;
          candidate = `${prefix}${String(attempt).padStart(2, '0')}`;
        }
        seen.add(candidate);
        sequence = attempt;
        item.id = candidate;
      }
    });

    return next;
  }

  static getUsers(): User[] {
    this.init();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const normalized = this.normalizeLegacyIdsForUsers(users);
    if (JSON.stringify(users) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
    }
    return normalized;
  }

  static saveUsers(users: User[]) {
    const normalized = this.normalizeLegacyIdsForUsers(users);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
    if (canUseSupabase()) { dbSaveUsers(normalized).catch((e) => console.warn('[Supabase] saveUsers falhou:', e)); }
  }

  static async saveUserAndWait(user: User, users: User[]): Promise<void> {
    if (!canUseSupabase()) {
      throw new Error('Sem conexão com o banco de dados. Verifique a internet e tente novamente.');
    }

    const normalized = this.normalizeLegacyIdsForUsers(users);
    const normalizedUser = normalized.find(item => item.id === user.id);
    if (!normalizedUser) {
      throw new Error('Não foi possível localizar o funcionário na lista para salvar.');
    }

    await dbSaveUsers([normalizedUser]);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
  }

  static async deleteUser(userId: string, currentUser?: User): Promise<boolean> {
    let list = this.getUsers();
    const target = list.find(u => u.id === userId);
    if (!target) return false;
    list = list.filter(u => u.id !== userId);
    // Atualiza localStorage imediatamente para evitar race condition com o polling
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    if (canUseSupabase()) {
      // Aguarda a exclusão no Supabase para garantir consistência antes do próximo ciclo de polling
      await dbDeleteUser(userId).catch((e) => console.warn('[Supabase] dbDeleteUser falhou:', e));
    }
    if (currentUser) {
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Exclusão de Usuário', registroTipo: 'USUARIO', registroId: userId, registroDescricao: target.name,
        detalhes: `Usuário ${target.name} removido.`,
      });
    }
    // Dispara evento para atualizar a UI imediatamente
    return true;
  }

  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  static setCurrentUser(user: User | null) {
    if (user) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  static getCurrentSession(): User | null { return this.getCurrentUser(); }
  static setCurrentSession(user: User | null) { this.setCurrentUser(user); }

  static async registerFirstAdmin(adminData: { name: string; email: string; passwordHash: string; phone?: string }): Promise<User> {
    const users = this.getUsers();
    if (users.some(u => u.role === 'ADMIN')) {
      throw new Error('Já existe um administrador cadastrado.');
    }

    const newUser: User = {
      id: 'admin-' + Date.now(), name: adminData.name, email: adminData.email.toLowerCase().trim(),
      passwordHash: adminData.passwordHash, role: 'ADMIN', phone: adminData.phone || '',
      status: 'ATIVO', createdAt: new Date().toISOString(),
    };

    const nextUsers = [...users, newUser];

    // O primeiro administrador só é considerado cadastrado depois da confirmação
    // do Supabase. Isso evita que o navegador fique com um admin apenas no cache
    // enquanto o banco não recebeu o registro.
    if (canUseSupabase()) {
      await dbSaveUsers([newUser]);
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));

    this.logAuditoria({
      usuarioId: newUser.id, usuarioNome: newUser.name, usuarioRole: 'ADMIN',
      acao: 'Cadastro do Primeiro Administrador', registroTipo: 'AUTH', registroId: newUser.id,
      registroDescricao: `Administrador ${newUser.name} cadastrado com sucesso.`,
    });

    return newUser;
  }

  static hasAnyAdmin(): boolean { const users = this.getUsers(); return users.some(u => u.role === 'ADMIN'); }

  static authenticate(email: string, password: string): User | null {
    const normalizedEmail = email.toLowerCase().trim();
    const user = this.getUsers().find(u => u.email.toLowerCase().trim() === normalizedEmail && u.status === 'ATIVO');
    if (!user) return null;
    const match = user.passwordHash === password
      || (user && typeof (user as any).password === 'string' && (user as any).password === password);
    if (!match) return null;
    const { passwordHash: _ignore, ...safeUser } = user as any;
    void _ignore;
    return safeUser as User;
  }

  static changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex < 0) return false;
    const user = users[userIndex];
    const currentMatch = user.passwordHash === currentPassword
      || (user && typeof (user as any).password === 'string' && (user as any).password === currentPassword);
    if (!currentMatch) return false;
    if (!newPassword || newPassword.length < 4) return false;
    users[userIndex] = { ...user, passwordHash: newPassword };
    this.saveUsers(users);
    this.logAuditoria({
      usuarioId: user.id, usuarioNome: user.name, usuarioRole: user.role,
      acao: 'Alteração de Senha', registroTipo: 'AUTH', registroId: user.id,
      registroDescricao: `${user.name} alterou sua senha de acesso ao sistema.`,
    });
    return true;
  }

  static getUserActiveValeCount(vendedorId: string): number {
    const vales = this.getVales();
    return vales.filter(v => v.vendedorId === vendedorId && v.status !== 'APROVADO' && v.status !== 'REPROVADO' && v.status !== 'PAGO').length;
  }

  // Filiais
  static getFiliais(): Filial[] { this.init(); return JSON.parse(localStorage.getItem(STORAGE_KEYS.FILIAIS) || '[]'); }

  static saveFilial(filial: Filial, currentUser: User): Filial {
    const list = this.getFiliais();
    const index = list.findIndex(f => f.id === filial.id);
    let isNew = false; let oldVal = '';
    if (index >= 0) { oldVal = JSON.stringify(list[index]); list[index] = filial; } else { isNew = true; list.push(filial); }
    localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(list));
    if (canUseSupabase()) { dbSaveFilial(filial).catch((e) => console.warn('[Supabase] saveFilial falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: isNew ? 'Cadastro de Filial' : 'Alteração de Filial',
      registroTipo: 'FILIAL', registroId: filial.id, registroDescricao: filial.name,
      valorAnterior: oldVal, novoValor: JSON.stringify(filial),
    });
    return filial;
  }

  static deleteFilial(filialId: string, currentUser: User): boolean {
    let list = this.getFiliais();
    const target = list.find(f => f.id === filialId);
    if (!target) return false;
    list = list.filter(f => f.id !== filialId);
    localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(list));
    if (canUseSupabase()) { dbDeleteFilial(filialId).catch((e) => console.warn('[Supabase] deleteFilial falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Exclusão de Filial', registroTipo: 'FILIAL', registroId: filialId, registroDescricao: target.name,
      detalhes: `Filial ${target.name} removida pelo administrador.`,
    });
    return true;
  }

  // Funções
  static getFuncoes(): Funcao[] {
    this.init();
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCOES) || '[]');
    const normalized = this.normalizeLegacyIdsForCatalog(items, 'FUN');
    if (JSON.stringify(items) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(normalized));
    }
    return normalized as Funcao[];
  }

  static saveFuncao(funcao: Funcao, currentUser: User): Funcao {
    const list = this.getFuncoes();
    const index = list.findIndex(f => f.id === funcao.id);
    const isNew = index < 0;
    if (index >= 0) list[index] = funcao; else list.push(funcao);
    localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(list));
    if (canUseSupabase()) { dbSaveFuncao(funcao).catch((e) => console.warn('[Supabase] saveFuncao falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: isNew ? 'Cadastro de Função' : 'Alteração de Função',
      registroTipo: 'FUNCAO', registroId: funcao.id, registroDescricao: funcao.name,
    });
    return funcao;
  }

  static deleteFuncao(funcaoId: string, currentUser: User): boolean {
    let list = this.getFuncoes();
    const target = list.find(f => f.id === funcaoId);
    if (!target) return false;
    list = list.filter(f => f.id !== funcaoId);
    localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(list));
    if (canUseSupabase()) { dbDeleteFuncao(funcaoId).catch((e) => console.warn('[Supabase] deleteFuncao falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Exclusão de Função', registroTipo: 'FUNCAO', registroId: funcaoId, registroDescricao: target.name,
    });
    return true;
  }

  // Serviços
  static getServicos(): Servico[] {
    this.init();
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
    const normalized = this.normalizeLegacyIdsForCatalog(items, 'SEV');
    if (JSON.stringify(items) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(normalized));
    }
    return normalized as Servico[];
  }

  static saveServico(servico: Servico, currentUser: User): Servico {
    const list = this.getServicos();
    const index = list.findIndex(s => s.id === servico.id);
    const isNew = index < 0;
    const oldVal = index >= 0 ? `Preço: R$ ${list[index].defaultPrice} | Comissão: ${list[index].commissionPercent}%` : '';
    if (index >= 0) list[index] = servico; else list.push(servico);
    localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(list));
    if (canUseSupabase()) { dbSaveServico(servico).catch((e) => console.warn('[Supabase] saveServico falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: isNew ? 'Cadastro de Serviço' : 'Alteração de Serviço/Comissão',
      registroTipo: 'SERVICO', registroId: servico.id, registroDescricao: servico.name,
      valorAnterior: oldVal, novoValor: `Preço: R$ ${servico.defaultPrice} | Comissão: ${servico.commissionPercent}%`,
    });
    return servico;
  }

  static deleteServico(servicoId: string, currentUser: User): boolean {
    let list = this.getServicos();
    const target = list.find(s => s.id === servicoId);
    if (!target) return false;
    list = list.filter(s => s.id !== servicoId);
    localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(list));
    if (canUseSupabase()) { dbDeleteServico(servicoId).catch((e) => console.warn('[Supabase] deleteServico falhou:', e)); }
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Exclusão de Serviço', registroTipo: 'SERVICO', registroId: servicoId, registroDescricao: target.name,
    });
    return true;
  }

  // Registros
  static getRegistrosServicos(): RegistroServico[] { this.init(); return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS_SERVICOS) || '[]'); }

  static saveRegistrosServicos(registros: RegistroServico[], changedIds?: string[]) {
    localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(registros));
    if (canUseSupabase()) {
      const ids = changedIds && changedIds.length > 0 ? changedIds : registros.map(r => r.id);
      addPendingIds(STORAGE_KEYS.PENDING_REGISTROS, ids);
      const toSend = changedIds && changedIds.length > 0 ? registros.filter(r => ids.includes(r.id)) : registros;
      dbSaveRegistrosServicos(toSend)
        .then(() => removePendingIds(STORAGE_KEYS.PENDING_REGISTROS, ids))
        .catch((e) => console.warn('[Supabase] saveRegistrosServicos falhou (será tentado novamente no próximo refresh):', e));
    }
  }

  // Força buscar os dados mais recentes do Supabase, ignorando o cache local.
  // Necessário porque `init()` só sincroniza UMA vez por carregamento de página: sem isso,
  // um Administrador/Gerente com a tela de Aprovações aberta nunca veria um atendimento
  // lançado por um Funcionário em outra sessão/dispositivo até recarregar a página inteira.
  private static _refreshingCriticalData: boolean = false;
  // Evita consultas repetidas ao voltar para a mesma tela. O Realtime continua
  // sendo a principal forma de receber alterações imediatamente.
  private static _lastScreenRefreshAt: Partial<Record<'EMPLOYEE' | 'APPROVALS' | 'PAYMENTS' | 'FULL', number>> = {};
  private static readonly SCREEN_REFRESH_TTL_MS = 30_000;

  // Busca os dados mais recentes do Supabase (incluindo usuários, filiais, funções e serviços)
  // garantindo que qualquer dispositivo veja imediatamente o que foi cadastrado em outro.
  static async refreshCriticalData(): Promise<{ registros: RegistroServico[]; vales: Vale[] }> {
    const fallbackRegistros: RegistroServico[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS_SERVICOS) || '[]');
    const fallbackVales: Vale[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VALES) || '[]');
    if (!canUseSupabase() || this._refreshingCriticalData) {
      return { registros: fallbackRegistros, vales: fallbackVales };
    }
    this._refreshingCriticalData = true;
    try {
      const [remoteRegistros, remoteVales, remoteUsers, remoteFiliais, remoteFuncoes, remoteServicos, remotePagamentos] = await Promise.all([
        safeDbCall(() => dbGetRegistrosServicos(), fallbackRegistros, 'refreshRegistros'),
        safeDbCall(() => dbGetVales(), fallbackVales, 'refreshVales'),
        safeDbCall(() => dbGetUsers(), JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'), 'refreshUsers'),
        safeDbCall(() => dbGetFiliais(), JSON.parse(localStorage.getItem(STORAGE_KEYS.FILIAIS) || '[]'), 'refreshFiliais'),
        safeDbCall(() => dbGetFuncoes(), JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCOES) || '[]'), 'refreshFuncoes'),
        safeDbCall(() => dbGetServicos(), JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]'), 'refreshServicos'),
        safeDbCall(() => dbGetPagamentos(), JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGAMENTOS) || '[]'), 'refreshPagamentos'),
      ]);
      const registros = mergeWithPending<RegistroServico>(remoteRegistros, STORAGE_KEYS.PENDING_REGISTROS, STORAGE_KEYS.REGISTROS_SERVICOS);
      const vales = mergeWithPending<Vale>(remoteVales, STORAGE_KEYS.PENDING_VALES, STORAGE_KEYS.VALES);
      localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(registros));
      localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(vales));
      // Atualiza também usuários, filiais, funções, serviços e pagamentos para sincronizar entre dispositivos
      if (Array.isArray(remoteUsers)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
      if (Array.isArray(remoteFiliais)) localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(remoteFiliais));
      if (Array.isArray(remoteFuncoes)) localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(remoteFuncoes));
      if (Array.isArray(remoteServicos)) localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(remoteServicos));
      if (Array.isArray(remotePagamentos)) localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(mergeWithPending<PagamentoSemanal>(remotePagamentos, STORAGE_KEYS.PENDING_PAGAMENTOS, STORAGE_KEYS.PAGAMENTOS)));
        return { registros, vales };
    } finally {
      this._refreshingCriticalData = false;
    }
  }

  /**
   * Sincronização sob demanda por tela: sem polling contínuo.
   * Busca apenas os conjuntos necessários quando a tela é aberta/retomada.
   */
  static async refreshForScreen(
    scope: 'EMPLOYEE' | 'APPROVALS' | 'PAYMENTS' | 'FULL' = 'FULL',
    force = false
  ): Promise<void> {
    if (!canUseSupabase() || this._refreshingCriticalData) return;

    // Se a tela acabou de sincronizar, não faça outra rodada só porque o
    // usuário voltou ao app. Alterações externas continuam chegando via Realtime.
    const now = Date.now();
    const last = this._lastScreenRefreshAt[scope] || 0;
    if (!force && now - last < this.SCREEN_REFRESH_TTL_MS) return;
    this._lastScreenRefreshAt[scope] = now;

    this._refreshingCriticalData = true;
    try {
      const local = (key: string) => {
        try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
      };
      const jobs: Record<string, Promise<any>> = {
        registros: safeDbCall(() => dbGetRegistrosServicos(), local(STORAGE_KEYS.REGISTROS_SERVICOS), 'refreshRegistros'),
        vales: safeDbCall(() => dbGetVales(), local(STORAGE_KEYS.VALES), 'refreshVales'),
      };
      if (scope === 'EMPLOYEE' || scope === 'PAYMENTS' || scope === 'FULL') {
        jobs.pagamentos = safeDbCall(() => dbGetPagamentos(), local(STORAGE_KEYS.PAGAMENTOS), 'refreshPagamentos');
      }
      if (scope === 'APPROVALS' || scope === 'PAYMENTS' || scope === 'FULL') {
        jobs.users = safeDbCall(() => dbGetUsers(), local(STORAGE_KEYS.USERS), 'refreshUsers');
        jobs.filiais = safeDbCall(() => dbGetFiliais(), local(STORAGE_KEYS.FILIAIS), 'refreshFiliais');
        jobs.servicos = safeDbCall(() => dbGetServicos(), local(STORAGE_KEYS.SERVICOS), 'refreshServicos');
      }
      if (scope === 'FULL') {
        jobs.funcoes = safeDbCall(() => dbGetFuncoes(), local(STORAGE_KEYS.FUNCOES), 'refreshFuncoes');
      }
      const result = await Promise.all(Object.entries(jobs).map(async ([key, promise]) => [key, await promise] as const));
      for (const [key, value] of result) {
        if (key === 'registros') localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(mergeWithPending(value, STORAGE_KEYS.PENDING_REGISTROS, STORAGE_KEYS.REGISTROS_SERVICOS)));
        else if (key === 'vales') localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(mergeWithPending(value, STORAGE_KEYS.PENDING_VALES, STORAGE_KEYS.VALES)));
        else if (key === 'pagamentos') localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(mergeWithPending<PagamentoSemanal>(value, STORAGE_KEYS.PENDING_PAGAMENTOS, STORAGE_KEYS.PAGAMENTOS)));
        else if (key === 'users') localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(value));
        else if (key === 'filiais') localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(value));
        else if (key === 'servicos') localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(value));
        else if (key === 'funcoes') localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(value));
      }
      } finally {
      this._refreshingCriticalData = false;
    }
  }

  private static getNextEditVersion(r: RegistroServico): number {
    const hist = r.editHistory || [];
    if (hist.length === 0) return 2;
    const max = hist.reduce((acc, h: any) => Math.max(acc, (h && typeof h.version === 'number') ? h.version : 0), 0);
    return (max > 0 ? max + 1 : hist.length + 2);
  }

  static addRegistro(registro: RegistroServico): RegistroServico {
    const registros = this.getRegistrosServicos();
    registros.unshift(registro);
    this.saveRegistrosServicos(registros, [registro.id]);
    return registro;
  }

  static setNotificacaoRegistroServico(registroId: string, notificacao: string, currentUser: User): boolean {
    return !!this.updateRegistro(
      registroId,
      {
        notificacao,
        notificacaoData: new Date().toISOString(),
        notificacaoAutor: currentUser.name,
      },
      currentUser
    );
  }

  static removerNotificacaoRegistroServico(registroId: string, currentUser: User): boolean {
    return !!this.updateRegistro(
      registroId,
      { notificacao: '', notificacaoData: '', notificacaoAutor: '' },
      currentUser
    );
  }

  static updateRegistro(registroId: string, updatedFields: Partial<RegistroServico>, currentUser: User): RegistroServico | null {
    const registros = this.getRegistrosServicos();
    const index = registros.findIndex(r => r.id === registroId);
    if (index < 0) return null;
    const original = { ...registros[index] };
    const edits: any[] = original.editHistory || [];
    const camposAlterados: string[] = [];
    for (const key of Object.keys(updatedFields)) {
      const k = key as keyof RegistroServico;
      const before = original[k]; const after = (updatedFields as any)[k];
      if (JSON.stringify(before) !== JSON.stringify(after)) camposAlterados.push(key);
    }
    const newVersion = this.getNextEditVersion(original);
    const entrada = {
      version: newVersion,
      editadoPorId: currentUser.id,
      editadoPorNome: currentUser.name,
      editadoEm: new Date().toISOString(),
      camposAlterados,
      valorAnterior: camposAlterados.reduce((acc, k) => {
        (acc as any)[k] = (original as any)[k]; return acc;
      }, {} as Partial<RegistroServico>),
      novoValor: camposAlterados.reduce((acc, k) => {
        (acc as any)[k] = (updatedFields as any)[k]; return acc;
      }, {} as Partial<RegistroServico>),
    };
    const novo: RegistroServico = {
      ...original, ...updatedFields,
      editHistory: [...edits, entrada],
      status: (updatedFields.status as any) || original.status || 'PENDENTE',
    };
    registros[index] = novo;
    this.saveRegistrosServicos(registros, [novo.id]);
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Edição de Atendimento', registroTipo: 'REGISTRO_SERVICO', registroId: novo.id,
      registroDescricao: `Atendimento - R$ ${novo.valorCobrado?.toFixed?.(2) ?? novo.valorCobrado}`,
      detalhes: `Campos: ${camposAlterados.join(', ')}`,
    });
    return novo;
  }

  static updateRegistroServicoDetalhes(
    registroId: string,
    data: { quantidade: number; valorUnitario: number; valorCobrado: number; motivoEdicao: string; commissionPercent?: number },
    currentUser: User
  ): RegistroServico | null {
    const registros = this.getRegistrosServicos();
    const idx = registros.findIndex(r => r.id === registroId);
    if (idx < 0) return null;

    const original = registros[idx];
    
    // Calcula novos valores de comissão e salão
    const commissionPercent = data.commissionPercent !== undefined ? data.commissionPercent : (original.commissionPercent || 0);
    const valorComissao = Number(((data.valorCobrado * commissionPercent) / 100).toFixed(2));
    const valorSalao = Number((data.valorCobrado - valorComissao).toFixed(2));

    const editLog = {
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      previousValue: original.valorCobrado,
      newValue: data.valorCobrado,
      reason: data.motivoEdicao
    };

    const edits = original.editHistory ? [...original.editHistory, editLog] : [editLog];

    const updated = {
      ...original,
      quantidade: data.quantidade,
      valorUnitario: data.valorUnitario,
      valorCobrado: data.valorCobrado,
      commissionPercent,
      valorComissao,
      valorSalao,
      editHistory: edits
    };

    registros[idx] = updated;
    this.saveRegistrosServicos(registros, [updated.id]);

    this.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Edição de Atendimento',
      registroTipo: 'REGISTRO_SERVICO',
      registroId: updated.id,
      registroDescricao: `Atendimento - R$ ${data.valorCobrado.toFixed(2)}`,
      valorAnterior: original.valorCobrado.toString(),
      novoValor: data.valorCobrado.toString(),
      detalhes: `Motivo: ${data.motivoEdicao}`
    });

    return updated;
  }

  static approveRegistro(registroId: string, currentUser: User): RegistroServico | null {
    const registro = this.getRegistrosServicos().find(r => r.id === registroId);
    // Aprovação é uma transição única: somente PENDENTE pode virar APROVADO.
    // Isso evita dupla aprovação por duplo clique ou chamadas repetidas no mesmo cache.
    if (!registro || registro.status !== 'PENDENTE') return null;
    return this.updateRegistro(registroId, {
      status: 'APROVADO',
      dataAprovacao: new Date().toISOString(),
      aprovadoPorId: currentUser.id,
      aprovadoPorNome: currentUser.name,
    }, currentUser);
  }

  static rejectRegistro(registroId: string, motivo: string, justificativa: string, currentUser: User): RegistroServico | null {
    return this.updateRegistro(registroId, {
      status: 'REPROVADO',
      motivoReprovacao: motivo,
      justificativaReprovacao: justificativa,
      dataAprovacao: new Date().toISOString(),
      aprovadoPorId: currentUser.id,
      aprovadoPorNome: currentUser.name,
    }, currentUser);
  }

  static getPendingRegistrosByVendedor(vendedorId: string): RegistroServico[] {
    return this.getRegistrosServicos().filter(r => r.vendedorId === vendedorId && r.status === 'PENDENTE');
  }

  // Vales
  static getVales(): Vale[] {
    this.init();
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.VALES) || '[]');
    return raw.map((v: any) => ({
      ...v,
      valor: v.valor ?? v.valorSolicitado ?? 0,
      valorSolicitado: v.valorSolicitado ?? v.valor ?? 0,
      dataSolicitacao: v.dataSolicitacao ?? v.data ?? v.createdAt ?? new Date().toISOString(),
      data: v.data ?? v.dataSolicitacao ?? new Date().toISOString().slice(0, 10),
    }));
  }

  static saveVales(vales: Vale[], changedIds?: string[]) {
    localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(vales));
    if (canUseSupabase()) {
      const ids = changedIds && changedIds.length > 0 ? changedIds : vales.map(v => v.id);
      addPendingIds(STORAGE_KEYS.PENDING_VALES, ids);
      const toSend = changedIds && changedIds.length > 0 ? vales.filter(v => ids.includes(v.id)) : vales;
      dbSaveVales(toSend)
        .then(() => removePendingIds(STORAGE_KEYS.PENDING_VALES, ids))
        .catch((e) => console.warn('[Supabase] saveVales falhou (será tentado novamente no próximo refresh):', e));
    }
  }

  static addVale(vale: Vale): Vale {
    const vales = this.getVales();
    vales.unshift(vale);
    this.saveVales(vales, [vale.id]);
    return vale;
  }

  static approveVale(valeId: string, currentUser: User, valorAprovado?: number, observacao?: string): Vale | null {
    const vales = this.getVales();
    const idx = vales.findIndex(v => v.id === valeId);
    if (idx < 0) return null;
    const v = vales[idx];
    const vendedor = this.getUsers().find(u => u.id === v.vendedorId);
    const motivoReprovacao = v.status === 'REPROVADO' ? (v.motivoReprovacao || '') : '';
    if (v.status === 'PENDENTE') {
      const finalValor = valorAprovado && valorAprovado > 0 ? valorAprovado : v.valor;
      const updated: Vale = {
        ...v,
        status: 'APROVADO',
        valor: finalValor,
        valorSolicitado: v.valorSolicitado ?? v.valor,
        aprovadoPorId: currentUser.id,
        aprovadoPorNome: currentUser.name,
        observacaoAdmin: observacao || v.observacaoAdmin,
        dataSolicitacao: v.dataSolicitacao ?? v.data ?? new Date().toISOString(),
        data: v.data ?? v.dataSolicitacao ?? new Date().toISOString().slice(0, 10),
      };
      vales[idx] = updated;
      this.saveVales(vales, [updated.id]);
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Aprovação de Vale', registroTipo: 'VALE', registroId: updated.id,
        registroDescricao: `Vale aprovado para ${vendedor?.name || v.vendedorId} - R$ ${updated.valor?.toFixed(2) || updated.valor}`,
        detalhes: observacao ? `Observação: ${observacao}` : '',
      });
          return updated;
    }
    return null;
  }

  static rejectVale(valeId: string, currentUser: User, motivoReprovacao: string, justificativa: string): Vale | null {
    const vales = this.getVales();
    const idx = vales.findIndex(v => v.id === valeId);
    if (idx < 0) return null;
    const v = vales[idx];
    const vendedor = this.getUsers().find(u => u.id === v.vendedorId);
    if (v.status === 'PENDENTE') {
      const updated: Vale = {
        ...v,
        status: 'REPROVADO',
        motivoReprovacao,
        justificativaReprovacao: justificativa,
        aprovadoPorId: currentUser.id,
        aprovadoPorNome: currentUser.name,
      };
      vales[idx] = updated;
      this.saveVales(vales, [updated.id]);
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Rejeição de Vale', registroTipo: 'VALE', registroId: updated.id,
        registroDescricao: `Vale reprovado para ${vendedor?.name || v.vendedorId} - R$ ${v.valor?.toFixed?.(2) || v.valor}`,
        valorAnterior: 'PENDENTE', novoValor: 'REPROVADO',
        detalhes: `Motivo: ${motivoReprovacao} — Justificativa: ${justificativa}`,
      });
          return updated;
    }
    return null;
  }

  // Pagamentos
  static getPagamentos(): PagamentoSemanal[] { this.init(); return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGAMENTOS) || '[]'); }

  /**
   * Reparo automático: detecta registros_servicos com status = PAGO
   * que NÃO tem PagamentoSemanal correspondente (via weeklyPaymentId)
   * e reconstrói o histórico agrupando por vendedor/semana.
   * Retorna a quantidade de pagamentos recriados.
   */
  static repararPagamentosPerdidos(): number {
    const todosRegistros = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS_SERVICOS) || '[]') as RegistroServico[];
    const todosVales = JSON.parse(localStorage.getItem(STORAGE_KEYS.VALES) || '[]') as Vale[];
    const pagamentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGAMENTOS) || '[]') as PagamentoSemanal[];
    const todosUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];

    const pagamentoIdsExistentes = new Set(pagamentos.map(p => p.id));

    const registrosPagos = todosRegistros.filter(r => r.status === 'PAGO');
    if (registrosPagos.length === 0) return 0;

    const grupos = new Map<string, {
      registros: RegistroServico[];
      vales: Vale[];
      vendedorId: string;
      filialId: string;
      pagamentoId: string;
      dataReferencia: string;
    }>();

    const agrupar = (r: RegistroServico) => {
      const pagamentoId = (r as any).weeklyPaymentId || `recovered-${r.vendedorId}-${new Date(r.dataHora).toISOString().slice(0, 10)}`;
      if (!grupos.has(pagamentoId)) {
        grupos.set(pagamentoId, {
          registros: [],
          vales: [],
          vendedorId: r.vendedorId,
          filialId: r.filialId || '',
          pagamentoId,
          dataReferencia: r.dataHora,
        });
      }
      grupos.get(pagamentoId)!.registros.push(r);
    };
    registrosPagos.forEach(agrupar);

    const valesPagos = todosVales.filter(v => v.status === 'PAGO' || v.status === 'DESCONTADO');
    valesPagos.forEach(v => {
      const pagamentoId = (v as any).weeklyPaymentId || `recovered-vale-${v.vendedorId}-${new Date(v.dataSolicitacao).toISOString().slice(0, 10)}`;
      if (grupos.has(pagamentoId)) {
        grupos.get(pagamentoId)!.vales.push(v);
      } else {
        grupos.set(pagamentoId, {
          registros: [],
          vales: [v],
          vendedorId: v.vendedorId,
          filialId: '',
          pagamentoId,
          dataReferencia: v.dataSolicitacao || new Date().toISOString(),
        });
      }
    });

    let recriados = 0;
    const novosPagamentos: PagamentoSemanal[] = [];

    for (const [pid, grupo] of grupos.entries()) {
      if (pagamentoIdsExistentes.has(pid)) continue;
      const vendedor = todosUsers.find(u => u.id === grupo.vendedorId);
      if (grupo.registros.length === 0 && grupo.vales.length === 0) continue;

      const totalBruto = grupo.registros.reduce((s, r) => s + Number(r.valorComissao || 0), 0);
      const totalVales = grupo.vales.reduce((s, v) => s + Number(v.valor || 0), 0);
      const faturamento = grupo.registros.reduce((s, r) => s + Number(r.valorCobrado || 0), 0);
      const liquido = Math.max(0, totalBruto - totalVales);

      const dataRef = new Date(grupo.dataReferencia);
      const dataPagamentoISO = dataRef.toISOString();
      const periodoInicio = dataRef.toISOString().slice(0, 10);
      const periodoFim = periodoInicio;
      const semanaRef = (grupo.registros[0] && (grupo.registros[0] as any).semanaRef) ||
        `Recuperado ${periodoInicio}`;
      const aprovadores = [...new Set([
        ...grupo.registros.map(r => r.aprovadoPorNome),
        ...grupo.vales.map(v => v.aprovadoPorNome),
      ].filter((nome): nome is string => Boolean(nome)))];
      const logPagamento = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDITORIA) || '[]')
        .find((log: AuditoriaLog) => log.registroTipo === 'PAGAMENTO' && log.registroId === pid && log.acao === 'Fechamento Semanal / Pagamento');

      const novoPag: PagamentoSemanal = {
        id: pid.startsWith('recovered-')
          ? 'pag-rec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5)
          : pid,
        filialId: grupo.filialId || vendedor?.filialId || '',
        vendedorId: grupo.vendedorId,
        semanaRef,
        periodoInicio,
        periodoFim,
        servicosIds: grupo.registros.map(r => r.id),
        servicoIds: grupo.registros.map(r => r.id),
        valesIds: grupo.vales.map(v => v.id),
        valeIds: grupo.vales.map(v => v.id),
        totalComissaoBruta: totalBruto,
        totalComissao: totalBruto,
        totalValesDescontados: totalVales,
        valesDescontados: totalVales,
        valorLiquidoPago: liquido,
        valorLiquido: liquido,
        totalServicosCount: grupo.registros.length,
        faturamentoRealizado: faturamento,
        outrosDescontos: 0,
        status: 'PAGO',
        dataPagamento: dataPagamentoISO,
        formaPagamento: 'OUTRO',
        observacoes: '[Recuperado automaticamente] Histórico restaurado a partir de serviços/vales com status PAGO.',
        observacao: '[Recuperado automaticamente] Histórico restaurado.',
        aprovadoPorNome: aprovadores.join(', ') || undefined,
        pagoPorId: logPagamento?.usuarioId,
        pagoPorNome: logPagamento?.usuarioNome,
        createdAt: dataPagamentoISO,
        saldoNegativoCarregado: undefined,
        saldoNegativoQuitado: false,
        gerouSaldoNegativo: false,
      };
      novosPagamentos.push(novoPag);
      recriados++;
    }

    if (recriados > 0) {
      const pagamentosAtualizados = [...novosPagamentos, ...pagamentos];
      localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(pagamentosAtualizados));
      if (canUseSupabase()) {
        addPendingIds(STORAGE_KEYS.PENDING_PAGAMENTOS, novosPagamentos.map(p => p.id));
        dbSavePagamentos(pagamentosAtualizados)
          .then(() => removePendingIds(STORAGE_KEYS.PENDING_PAGAMENTOS, novosPagamentos.map(p => p.id)))
          .catch(e => console.warn('[Supabase] savePagamentos (reparo) falhou:', e));
      }
    }
    return recriados;
  }

  static getPagamentoById(id: string): PagamentoSemanal | null {
    return this.getPagamentos().find(p => p.id === id) || null;
  }

  static processarPagamentoSemanal(
    vendedorId: string,
    periodoInicio: string,
    periodoFim: string,
    registrosSelecionadosIds: string[],
    valesSelecionadosIds: string[],
    currentUser: User,
    opcoes: { formaPagamento: 'PIX' | 'DINHEIRO' | 'TRANSFERENCIA' | 'CARTAO' | 'OUTRO'; observacoes?: string; outrosDescontos?: number }
  ): PagamentoSemanal | null {
    const vendedor = this.getUsers().find(u => u.id === vendedorId);
    if (!vendedor) return null;
    const todosRegistros = this.getRegistrosServicos();
    const todosVales = this.getVales();
    const registros = todosRegistros.filter(r => registrosSelecionadosIds.includes(r.id));
    const vales = todosVales.filter(v => valesSelecionadosIds.includes(v.id));
    if (registros.length === 0) return null;

    // Um pagamento só pode liquidar serviços aprovados e vales aprovados.
    // Itens já pagos possuem weeklyPaymentId e nunca podem entrar novamente.
    if (registros.some(r => r.status !== 'APROVADO' || !!r.weeklyPaymentId)) return null;
    if (vales.some(v => v.status !== 'APROVADO' || !!v.weeklyPaymentId)) return null;

    // Proteção contra repetição do mesmo fechamento: se todos os IDs já aparecem
    // em um pagamento existente, não cria outro pagamento para os mesmos itens.
    const pagamentosExistentes = this.getPagamentos();
    const servicoIdsSet = new Set(registrosSelecionadosIds);
    const valeIdsSet = new Set(valesSelecionadosIds);
    const jaLiquidado = pagamentosExistentes.some(p =>
      p.vendedorId === vendedorId &&
      (p.servicosIds || []).some(id => servicoIdsSet.has(id))
    ) || pagamentosExistentes.some(p =>
      p.vendedorId === vendedorId &&
      (p.valesIds || []).some(id => valeIdsSet.has(id))
    );
    if (jaLiquidado) return null;
    const totalComissaoBruta = registros.reduce((sum, r) => sum + Number(r.valorComissao || 0), 0);
    const totalValesDescontados = vales.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const outrosDescontos = Number(opcoes?.outrosDescontos || 0);
    const valorLiquido = totalComissaoBruta - totalValesDescontados - outrosDescontos;
    const dataPagamentoISO = new Date().toISOString();
    const semanaRef = `Semana ${periodoInicio} a ${periodoFim}`;
    const pagamentoId = 'pag-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const saldoNegativo = valorLiquido < 0 ? Math.abs(valorLiquido) : 0;
    const aprovadores = [...new Set([
      ...registros.map(r => r.aprovadoPorNome),
      ...vales.map(v => v.aprovadoPorNome),
    ].filter((nome): nome is string => Boolean(nome)))];
    const updatedRegistros = this.getRegistrosServicos().map(r =>
      registrosSelecionadosIds.includes(r.id) ? { ...r, status: 'PAGO' as any, weeklyPaymentId: pagamentoId, dataAprovacao: r.dataAprovacao || dataPagamentoISO } as RegistroServico : r
    );
    this.saveRegistrosServicos(updatedRegistros, registrosSelecionadosIds);
    const updatedVales = this.getVales().map(v =>
      valesSelecionadosIds.includes(v.id) ? { ...v, status: 'PAGO' as any, weeklyPaymentId: pagamentoId } as Vale : v
    );
    this.saveVales(updatedVales, valesSelecionadosIds);
    const faturamentoRealizado = registros.reduce((sum, r) => sum + Number(r.valorCobrado || 0), 0);
    const newPayment: PagamentoSemanal = {
      id: pagamentoId,
      filialId: vendedor.filialId || (registros[0] && registros[0].filialId) || '',
      vendedorId, semanaRef,
      periodoInicio: periodoInicio.slice(0, 10),
      periodoFim: periodoFim.slice(0, 10),
      servicosIds: registrosSelecionadosIds,
      servicoIds: registrosSelecionadosIds,
      valesIds: valesSelecionadosIds,
      valeIds: valesSelecionadosIds,
      totalComissaoBruta, totalComissao: totalComissaoBruta,
      totalValesDescontados, valesDescontados: totalValesDescontados,
      valorLiquidoPago: Math.max(0, valorLiquido), valorLiquido: Math.max(0, valorLiquido),
      totalServicosCount: registros.length,
      faturamentoRealizado, outrosDescontos,
      status: 'PAGO',
      dataPagamento: dataPagamentoISO,
      formaPagamento: opcoes?.formaPagamento || 'PIX',
      observacoes: opcoes?.observacoes || '',
      observacao: opcoes?.observacoes || '',
      aprovadoPorNome: aprovadores.join(', ') || undefined,
      pagoPorId: currentUser.id, pagoPorNome: currentUser.name,
      createdAt: dataPagamentoISO,
      saldoNegativoCarregado: saldoNegativo > 0 ? saldoNegativo : undefined,
      saldoNegativoQuitado: false,
      gerouSaldoNegativo: saldoNegativo > 0,
    };
    const pagamentos = this.getPagamentos();
    pagamentos.unshift(newPayment);
    localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(pagamentos));
    if (canUseSupabase()) {
      addPendingIds(STORAGE_KEYS.PENDING_PAGAMENTOS, [newPayment.id]);
      dbSavePagamentos([newPayment])
        .then(() => removePendingIds(STORAGE_KEYS.PENDING_PAGAMENTOS, [newPayment.id]))
        .catch((e) => console.warn('[Supabase] savePagamentos falhou:', e));
    }

    if (saldoNegativo > 0) {
      const saldoNovo: VendedorSaldoNegativo = {
        id: 'sn-' + Date.now().toString(36),
        vendedorId,
        semanaRef,
        periodoInicio: periodoInicio.slice(0, 10),
        periodoFim: periodoFim.slice(0, 10),
        valorDevido: saldoNegativo,
        valorQuitado: 0,
        quitado: false,
        createdAt: dataPagamentoISO,
      };
      const saldos = this.getSaldosNegativos();
      saldos.unshift(saldoNovo);
      this.saveSaldosNegativos(saldos);
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Saldo Negativo Gerado', registroTipo: 'PAGAMENTO', registroId: pagamentoId,
        registroDescricao: `Vendedor ${vendedor.name} ficou com saldo negativo de R$ ${saldoNegativo.toFixed(2)} - deve com novos serviços.`,
        valorAnterior: `R$ ${totalComissaoBruta.toFixed(2)} bruto`,
        novoValor: `R$ -${saldoNegativo.toFixed(2)} saldo negativo carregado`,
      });
    }

    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Fechamento Semanal / Pagamento', registroTipo: 'PAGAMENTO', registroId: pagamentoId,
      registroDescricao: `Pagamento para ${vendedor.name} - ${semanaRef}`,
      valorAnterior: `R$ ${totalComissaoBruta.toFixed(2)} bruto`,
      novoValor: `R$ ${Math.max(0, valorLiquido).toFixed(2)} líquido (${registros.length} serviços, ${vales.length} vales descontados)${saldoNegativo > 0 ? ' + SALDO NEGATIVO' : ''}`,
      detalhes: opcoes?.observacoes ? `Obs.: ${opcoes.observacoes}` : '',
    });

    const pInicioNorm = periodoInicio.slice(0, 10);
    const pFimNorm = periodoFim.slice(0, 10);
    const prevCycle = getPreviousWeekCycle(getEffectiveNow());
    if (pInicioNorm === prevCycle.startDateStr && pFimNorm === prevCycle.endDateStr) {
      const statusAtualizado = this.verificarFechamentoSemanaAnterior(pInicioNorm, pFimNorm);
      if (statusAtualizado.todosPagos) {
        try {
          const res = this.limparHistoricoAoIniciarNovoCiclo(pInicioNorm, pFimNorm, currentUser);
          if (res.limpou) {
            console.log('[Ciclo] Limpeza automática concluída.', res.resumo);
            window.dispatchEvent(new CustomEvent('nexus_cycle_auto_cleanup', { detail: res.resumo }));
          }
        } catch (e) {
          console.warn('[Ciclo] Falha na limpeza automática de ciclo:', e);
        }
      }
    }

    return newPayment;
  }

  static verificarFechamentoSemanaAnterior(prevStart: string, prevEnd: string): FechamentoStatus {
    const vendedores = this.getUsers().filter(u => u.role === 'VENDEDOR' && u.status === 'ATIVO');
    const pagamentos = this.getPagamentos();
    const registros = this.getRegistrosServicos();

    const pagos: { userId: string; userName: string; valorPago: number }[] = [];
    const saldoNegativo: { userId: string; userName: string; valorDevido: number; saldoId: string }[] = [];
    const naoPagos: { userId: string; userName: string; totalComissao: number }[] = [];

    for (const vend of vendedores) {
      const pagamento = pagamentos.find(p =>
        p.vendedorId === vend.id &&
        p.periodoInicio === prevStart &&
        p.periodoFim === prevEnd &&
        p.status === 'PAGO'
      );
      if (pagamento) {
        const snAtivo = this.getSaldoNegativoAtivo(vend.id);
        if (snAtivo &&
            snAtivo.periodoInicio === prevStart &&
            snAtivo.periodoFim === prevEnd &&
            !snAtivo.quitado) {
          saldoNegativo.push({
            userId: vend.id,
            userName: vend.name,
            valorDevido: this.getSaldoNegativoDevedor(vend.id),
            saldoId: snAtivo.id,
          });
        } else {
          pagos.push({
            userId: vend.id,
            userName: vend.name,
            valorPago: pagamento.valorLiquidoPago || 0,
          });
        }
        continue;
      }
      const comissao = registros
        .filter(r => r.vendedorId === vend.id &&
          r.status === 'APROVADO' &&
          r.dataHora.slice(0, 10) >= prevStart &&
          r.dataHora.slice(0, 10) <= prevEnd)
        .reduce((s, r) => s + Number(r.valorComissao || 0), 0);
      if (comissao > 0) {
        naoPagos.push({
          userId: vend.id,
          userName: vend.name,
          totalComissao: comissao,
        });
      }
    }

    return {
      totalVendedoresAtivos: vendedores.length,
      pagos,
      saldoNegativo,
      naoPagos,
      todosPagos: naoPagos.length === 0,
      periodoAnteriorInicio: prevStart,
      periodoAnteriorFim: prevEnd,
    };
  }

  static logCycleOverride(
    motivo: string,
    tipo: 'DOMINGO_OVERRIDE' | 'LIBERACAO_ANTECIPADA',
    currentUser: User,
    detalhes?: string
  ): void {
    const overrides = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.CYCLE_OVERRIDES) || '[]'); }
      catch { return []; }
    })();
    overrides.unshift({
      id: 'ovr-' + Date.now().toString(36),
      tipo,
      motivo,
      detalhes: detalhes || '',
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      dataHora: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.CYCLE_OVERRIDES, JSON.stringify(overrides.slice(0, 500)));
    this.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: tipo === 'DOMINGO_OVERRIDE' ? 'Override: Acesso em Domingo' : 'Override: Liberação Antecipada',
      registroTipo: 'SISTEMA',
      registroId: 'cycle-gatekeeper',
      registroDescricao: motivo,
      detalhes: detalhes || '',
    });
  }

  static getSaldosNegativos(): VendedorSaldoNegativo[] {
    this.init();
    const raw = localStorage.getItem(STORAGE_KEYS.SALDOS_NEGATIVOS);
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  }

  static saveSaldosNegativos(saldos: VendedorSaldoNegativo[]) {
    localStorage.setItem(STORAGE_KEYS.SALDOS_NEGATIVOS, JSON.stringify(saldos));
  }

  static getSaldoNegativoAtivo(vendedorId: string): VendedorSaldoNegativo | null {
    return this.getSaldosNegativos()
      .filter(s => s.vendedorId === vendedorId && !s.quitado)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }

  static getSaldoNegativoDevedor(vendedorId: string): number {
    const ativo = this.getSaldoNegativoAtivo(vendedorId);
    if (!ativo) return 0;
    return Math.max(0, ativo.valorDevido - ativo.valorQuitado);
  }

  static abaterSaldoNegativo(vendedorId: string, valorComissao: number, registroId: string, currentUser: User): number {
    const devendo = this.getSaldoNegativoDevedor(vendedorId);
    if (devendo <= 0) return 0;
    const valorAbater = Math.min(valorComissao, devendo);
    const saldos = this.getSaldosNegativos();
    const idx = saldos.findIndex(s => s.vendedorId === vendedorId && !s.quitado);
    if (idx < 0) return 0;
    const novoQuitado = saldos[idx].valorQuitado + valorAbater;
    const agoraQuitado = novoQuitado >= saldos[idx].valorDevido - 0.01;
    saldos[idx] = {
      ...saldos[idx],
      valorQuitado: Number(novoQuitado.toFixed(2)),
      quitado: agoraQuitado,
      quitadoEm: agoraQuitado ? new Date().toISOString() : undefined,
    };
    this.saveSaldosNegativos(saldos);
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Abatimento de Saldo Negativo', registroTipo: 'REGISTRO_SERVICO', registroId,
      registroDescricao: `R$ ${valorAbater.toFixed(2)} abatido do saldo negativo do vendedor. Restante: R$ ${Math.max(0, (saldos[idx].valorDevido - saldos[idx].valorQuitado)).toFixed(2)}.${agoraQuitado ? ' SALDO QUITADO!' : ''}`,
    });
    return valorAbater;
  }

  // Auditoria
  static getAuditoria(): AuditoriaLog[] { this.init(); return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDITORIA) || '[]'); }
  static getAuditoriaLogs(): AuditoriaLog[] { return this.getAuditoria(); }

  static async restoreBackup(backup: {
    usuarios: User[];
    filiais: Filial[];
    funcoes: Funcao[];
    servicos: Servico[];
    registrosServicos: RegistroServico[];
    vales: Vale[];
    pagamentos: PagamentoSemanal[];
    auditoria: AuditoriaLog[];
    config: SystemConfig;
  }, currentUser: User): Promise<void> {
    if (canUseSupabase()) await dbRestoreBackupData(backup);

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(backup.usuarios));
    localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify(backup.filiais));
    localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify(backup.funcoes));
    localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(backup.servicos));
    localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify(backup.registrosServicos));
    localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify(backup.vales));
    localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify(backup.pagamentos));
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(backup.auditoria));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(backup.config));
    localStorage.setItem(STORAGE_KEYS.PENDING_REGISTROS, '[]');
    localStorage.setItem(STORAGE_KEYS.PENDING_VALES, '[]');
    localStorage.setItem(STORAGE_KEYS.PENDING_PAGAMENTOS, '[]');

    this.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Restauração de Backup',
      registroTipo: 'SISTEMA',
      registroId: 'backup-restore',
      registroDescricao: `Backup da rede ${backup.config.salonNetworkName} restaurado.`,
    });
  }

  static logAuditoria(entry: Omit<AuditoriaLog, 'id' | 'dataHora'>) {
    const list = this.getAuditoria();
    const newLog: AuditoriaLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      dataHora: new Date().toISOString(), ...entry,
    };
    list.unshift(newLog);
    if (list.length > 500) list.pop();
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(list));
    if (canUseSupabase()) {
      dbSaveAuditoria(list).catch((e) => console.warn('[Supabase] logAuditoria falhou:', e));
    }
  }

  // System Config
  static getConfig(): SystemConfig { this.init(); return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG)); }

  static saveConfig(config: SystemConfig, currentUser: User) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    if (canUseSupabase()) {
      dbSaveConfig(config).catch((e) => console.warn('[Supabase] saveConfig (incluindo ícones customizados) falhou:', e));
    }
    const temIconesCustomizados = !!(config.menuCustomizations && Object.keys(config.menuCustomizations).length > 0);
    this.logAuditoria({
      usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
      acao: 'Alteração de Configurações do Sistema', registroTipo: 'CONFIG', registroId: 'sys-config',
      registroDescricao: `Nome da rede: ${config.salonNetworkName}${temIconesCustomizados ? ' (inclui ícones customizados do menu)' : ''}`,
    });
  }

  // Limpa todos os dados do sistema (sem restaurar demos)
  static resetDemoData(currentUser?: User) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FILIAIS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FUNCOES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REGISTROS_SERVICOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAGAMENTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    if (canUseSupabase()) {
      dbClearAllHistory().catch(e => console.warn('[Supabase] resetDemoData/clearHistory falhou:', e));
    }
    if (currentUser) {
      this.logAuditoria({
        usuarioId: currentUser.id, usuarioNome: currentUser.name, usuarioRole: currentUser.role,
        acao: 'Limpeza Geral do Sistema', registroTipo: 'CONFIG', registroId: 'sys-reset',
        registroDescricao: 'Todos os dados foram removidos pelo administrador.',
      });
    }
  }
}