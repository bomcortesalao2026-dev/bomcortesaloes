import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  Users, 
  Scissors, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  CreditCard, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  Filter, 
  BarChart3, 
  PieChart,
  Edit3,
  Search,
  Settings,
  Layers,
  CheckCheck,
  RefreshCw,
  Clock,
  Lock,
  Bell,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Filial, Servico, RegistroServico, Vale, PagamentoSemanal, ActiveModule, SystemConfig } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';
import { EditServiceModal } from './EditServiceModal';
import { PedidoNotificacaoModal } from './PedidoNotificacaoModal';
import { SalonLogo } from './SalonLogo';
import { WeekCycleBadge } from './WeekCycleBadge';
import { MonthlyRevenueConsolidation } from './MonthlyRevenueConsolidation';
import { calculateWeekCycle } from '../utils/dateCycleUtils';
import { employeesIcon, filiaisIcon, gerentesIcon } from '../utils/menuIcons';

interface AdminDashboardProps {
  currentUser: User;
  onNavigate: (module: ActiveModule) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onNavigate }) => {
  const [selectedFilialId, setSelectedFilialId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableFilialFilter, setTableFilialFilter] = useState<string>('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL');
  const [onlyWithNotification, setOnlyWithNotification] = useState<boolean>(false);
  const [periodoView, setPeriodoView] = useState<'CICLO_ATIVO' | 'HISTORICO_TOTAL'>('CICLO_ATIVO');
  const [config, setConfig] = useState<SystemConfig>(StorageService.getConfig());
  const [hideValues, setHideValues] = useState<boolean>(() => localStorage.getItem('dashboard_hide_values') === 'true');

  const fmtVal = (val: number) => hideValues ? '••••••' : formatCurrency(val);

  const toggleHideValues = () => {
    setHideValues(prev => {
      localStorage.setItem('dashboard_hide_values', String(!prev));
      return !prev;
    });
  };

  // Edit Service State
  const [editingRecord, setEditingRecord] = useState<RegistroServico | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Notification Modal State
  const [notificacaoModalRecord, setNotificacaoModalRecord] = useState<RegistroServico | null>(null);

  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const reloadData = () => setRefreshTrigger(prev => prev + 1);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  const forceRefreshDashboard = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await StorageService.refreshForScreen('FULL');
      reloadData();
      setLastRefreshTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    reloadData();
    forceRefreshDashboard();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshDashboard();
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => document.removeEventListener('visibilitychange', refreshOnReturn);
  }, []);


  const filiais = useMemo(() => StorageService.getFiliais(), [refreshTrigger]);
  const users = useMemo(() => StorageService.getUsers(), [refreshTrigger]);
  const servicos = useMemo(() => StorageService.getServicos(), [refreshTrigger]);
  const allRegistros = useMemo(() => StorageService.getRegistrosServicos(), [refreshTrigger]);
  const allVales = useMemo(() => StorageService.getVales(), [refreshTrigger]);
  const allPagamentos = useMemo(() => StorageService.getPagamentos(), [refreshTrigger]);

  // Filter based on selected filial & role scope
  const targetFilialId = currentUser.role === 'GERENTE' 
    ? (currentUser.filialId || undefined) 
    : (selectedFilialId === 'ALL' ? undefined : selectedFilialId);

  const filteredRegistros = useMemo(() => {
    let list = allRegistros.filter(r => {
      if (targetFilialId && r.filialId !== targetFilialId) return false;
      return true;
    });

    if (periodoView === 'CICLO_ATIVO') {
      const cycle = calculateWeekCycle(new Date());
      const startT = new Date(cycle.startDateStr + 'T00:00:00').getTime();
      const endT = new Date(cycle.endDateStr + 'T23:59:59').getTime();
      return list.filter(r => {
        const t = new Date(r.dataHora).getTime();
        return t >= startT && t <= endT;
      });
    }

    return list;
  }, [allRegistros, targetFilialId, periodoView]);

  // ==========================================
  // 7 MÉTRICAS PRINCIPAIS EXIGIDAS PELO USUÁRIO:
  // 1. Quantidade de Serviços Realizados (somando todas as filiais)
  // 2. Valor Bruto (Faturamento Total)
  // 3. Comissões a Pagar (Equipe)
  // 4. Valor Líquido (Bruto - Comissões)
  // 5. Quantidade de Filiais
  // 6. Quantidade de Funcionários (Vendedores/Profissionais)
  // 7. Quantidade de Gerentes
  // ==========================================

  // 1. Quantidade de Serviços Realizados (somando a quantidade de atendimentos realizados)
  const totalServicosRealizados = useMemo(() => {
    return filteredRegistros
      .filter(r => r.status === 'APROVADO' || r.status === 'PAGO')
      .reduce((sum, r) => sum + (r.quantidade || 1), 0);
  }, [filteredRegistros]);

  // 2. Valor Bruto (Faturamento de todos os serviços aprovados/pagos)
  const totalValorBruto = useMemo(() => {
    return filteredRegistros
      .filter(r => r.status === 'APROVADO' || r.status === 'PAGO')
      .reduce((sum, r) => sum + r.valorCobrado, 0);
  }, [filteredRegistros]);

  // 3. Comissões a Pagar (Total de comissões geradas para a equipe)
  const totalComissoesAPagar = useMemo(() => {
    return filteredRegistros
      .filter(r => r.status === 'APROVADO' || r.status === 'PAGO')
      .reduce((sum, r) => sum + r.valorComissao, 0);
  }, [filteredRegistros]);

  // 4. Valor Líquido (Faturamento Bruto - Comissões dos Profissionais)
  const totalValorLiquido = useMemo(() => {
    return Math.max(0, totalValorBruto - totalComissoesAPagar);
  }, [totalValorBruto, totalComissoesAPagar]);

  // 5. Quantidade de Filiais
  const totalFiliaisCount = useMemo(() => {
    return filiais.filter(f => f.status === 'ATIVA').length;
  }, [filiais]);

  // 6. Quantidade de Funcionários / Profissionais
  const totalFuncionariosCount = useMemo(() => {
    return users.filter(u => u.role === 'VENDEDOR' && u.status === 'ATIVO' && (!targetFilialId || u.filialId === targetFilialId)).length;
  }, [users, targetFilialId]);

  // 7. Quantidade de Gerentes
  const totalGerentesCount = useMemo(() => {
    return users.filter(u => u.role === 'GERENTE' && u.status === 'ATIVO' && (!targetFilialId || u.filialId === targetFilialId)).length;
  }, [users, targetFilialId]);

  // Pendencies for alerts
  const servicosPendentesCount = allRegistros.filter(r => (!targetFilialId || r.filialId === targetFilialId) && r.status === 'PENDENTE').length;
  const valesPendentesCount = allVales.filter(v => (!targetFilialId || v.filialId === targetFilialId) && v.status === 'PENDENTE').length;

  // Check if order has any active notification, alert or change history
  const hasOrderNotification = (r: RegistroServico) => {
    const hasRealEdits = r.editHistory && r.editHistory.some(h => {
      if (h.reason || h.previousValue) return true;
      if (h.camposAlterados) {
        const ignored = ['status', 'dataAprovacao', 'aprovadoPorId', 'aprovadoPorNome', 'weeklyPaymentId'];
        return h.camposAlterados.some((c: string) => !ignored.includes(c));
      }
      return false;
    });

    return Boolean(
      (r.notificacao && r.notificacao.trim()) ||
      (r.motivoReprovacao && r.motivoReprovacao.trim()) ||
      (r.justificativaReprovacao && r.justificativaReprovacao.trim()) ||
      hasRealEdits
    );
  };

  const totalNotificacoesCount = useMemo(() => {
    return filteredRegistros.filter(r => hasOrderNotification(r)).length;
  }, [filteredRegistros]);

  // Recent Services for Rapid Editing by Admin / Manager
  const recentServices = useMemo(() => {
    let list = [...filteredRegistros];

    // Table filial filter
    if (tableFilialFilter !== 'ALL') {
      list = list.filter(r => r.filialId === tableFilialFilter);
    }

    // Table status filter
    if (tableStatusFilter !== 'ALL') {
      list = list.filter(r => r.status === tableStatusFilter);
    }

    // Only with notification filter
    if (onlyWithNotification) {
      list = list.filter(r => hasOrderNotification(r));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => {
        const servName = (servicos.find(s => s.id === r.servicoId)?.name || '').toLowerCase();
        const vendName = (users.find(u => u.id === r.vendedorId)?.name || '').toLowerCase();
        const filialName = (filiais.find(f => f.id === r.filialId)?.name || '').toLowerCase();
        const notif = (r.notificacao || '').toLowerCase();
        return servName.includes(q) || vendName.includes(q) || filialName.includes(q) || notif.includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()).slice(0, 20);
  }, [filteredRegistros, tableFilialFilter, tableStatusFilter, onlyWithNotification, searchTerm, servicos, users, filiais]);

  // Open edit modal for service
  const handleOpenEdit = (record: RegistroServico) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const isGerente = currentUser.role === 'GERENTE';
  const currentFilial = useMemo(() => {
    if (isGerente && currentUser.filialId) {
      return filiais.find(f => f.id === currentUser.filialId);
    }
    return null;
  }, [filiais, isGerente, currentUser.filialId]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] shadow-sm relative overflow-hidden">
        
        {/* Glow Accent Removido */}

        <div className="flex items-center gap-4 relative z-10">
          <SalonLogo size="lg" showText={false} />
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E]">
              <Sparkles className="w-4 h-4 text-[#C8A45D]" />
              <span>{isGerente ? `PAINEL GERENCIAL DA UNIDADE // ${currentFilial?.name || 'SUA FILIAL'}` : 'PAINEL EXECUTIVO & GESTÃO DA REDE'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--nexus-text)] tracking-wide uppercase mt-0.5">
              {isGerente ? (currentFilial?.name || 'SUA FILIAL') : (config.salonNetworkName || 'Bom Corte Salões')}
            </h2>
            <p className="text-xs text-[#B49A73]">
              {isGerente ? `Gestão local da unidade ${currentFilial?.city || ''} — atendimentos, equipe e aprovações` : (config.slogan || 'Rede de Alta Performance & Gestão de Salões')}
            </p>
          </div>
        </div>

        {/* Action Controls & Filial Selector */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {!isGerente && currentUser.role === 'ADMIN' && (
            <div className="flex items-center gap-1.5 bg-[#10283D] border border-[#C8A45D]/40 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[#D8B56B] shrink-0" />
              <select
                id="admin-filial-selector"
                value={selectedFilialId}
                onChange={(e) => setSelectedFilialId(e.target.value)}
                className="bg-transparent text-white text-xs outline-none font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-[#10283D] text-white">🌐 Todas as Filiais ({filiais.length})</option>
                {filiais.map(f => (
                  <option key={f.id} value={f.id} className="bg-[#10283D] text-white">📍 {f.name}</option>
                ))}
              </select>
            </div>
          )}

          {lastRefreshTime && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#B49A73]">
              <Clock className="w-3 h-3" />
              <span>Atualizado às {lastRefreshTime}</span>
            </span>
          )}
          <button
            type="button"
            onClick={forceRefreshDashboard}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 rounded-xl bg-[#10283D] border border-[#C8A45D]/40 text-[#D7C08E] hover:text-white hover:border-[#C8A45D]/70 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
            title="Sincronizar com Supabase agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={toggleHideValues}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              hideValues
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 hover:bg-amber-500/30'
                : 'bg-[#10283D] border-[#C8A45D]/30 hover:border-[#D9B76C] text-[#D7C08E] hover:text-white'
            }`}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

      </div>

{/* Week Cycle Indicator Card (Monday to Saturday) */}
      <WeekCycleBadge onOpenSettlement={currentUser.role === 'ADMIN' ? () => onNavigate('PAGAMENTOS') : undefined} />

      {/* Pending Approvals Row (Always side-by-side on mobile) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-1">
        {/* Serviços Pendentes */}
        <div 
          onClick={() => onNavigate('APROVACOES')}
          className={`p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-cyan-400 transition-all cursor-pointer group shadow-sm flex items-center justify-between`}
        >
          <div>
            <span className="text-[10px] font-mono text-[#A8B8CC] uppercase block tracking-wider mb-1">
              Aprovar Serviços
            </span>
            <div className="text-3xl sm:text-4xl font-serif font-black italic text-cyan-600 mt-0.5 flex items-center gap-2">
              {servicosPendentesCount > 0 ? (
                <div className="piscante animate-pulse flex items-center gap-2">
                  <span className="badge-pendente-alerta">{servicosPendentesCount}</span>
                  <span className="text-cyan-300 text-2xl sm:text-3xl animate-bounce drop-shadow-[0_0_15px_#22d3ee]">✂️</span>
                </div>
              ) : (
                <span>{servicosPendentesCount}</span>
              )}
            </div>
            {servicosPendentesCount > 0 ? (
              <div className="piscante animate-pulse mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">AGUARDANDO</span>
              </div>
            ) : (
              <span className="text-[10px] text-cyan-200/60 mt-1 block">
                Aguardando
              </span>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_4px_18px_rgba(34,211,238,0.4)]">
              <CheckCircle2 className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Vales Pendentes */}
        <div 
          onClick={() => onNavigate('VALES')}
          className={`p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-fuchsia-400 transition-all cursor-pointer group shadow-sm flex items-center justify-between`}
        >
          <div>
            <span className="text-[10px] font-mono text-[#A8B8CC] uppercase block tracking-wider mb-1">
              Aprovar Vales
            </span>
            <div className="text-3xl sm:text-4xl font-serif font-black italic text-fuchsia-600 mt-0.5 flex items-center gap-2">
              {valesPendentesCount > 0 ? (
                <div className="piscante animate-pulse flex items-center gap-2">
                  <span className="badge-pendente-alerta">{valesPendentesCount}</span>
                  <span className="text-fuchsia-300 text-2xl sm:text-3xl animate-bounce drop-shadow-[0_0_15px_#e879f9]">💲</span>
                </div>
              ) : (
                <span>{valesPendentesCount}</span>
              )}
            </div>
            {valesPendentesCount > 0 ? (
              <div className="piscante animate-pulse mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider">AGUARDANDO</span>
              </div>
            ) : (
              <span className="text-[10px] text-fuchsia-200/60 mt-1 block">
                Aguardando
              </span>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_4px_18px_rgba(232,121,249,0.4)]">
              <DollarSign className="w-6 h-6 text-fuchsia-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7 PRINCIPAL METRICS CARDS AS REQUESTED BY THE USER */}
      {/* ========================================================= */}
      <div className="mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="text-[11px] font-mono text-[#D7C08E] uppercase tracking-widest flex items-center gap-2 font-bold">
            <Layers className="w-4 h-4 text-[#C8A45D]" />
            <span>{isGerente ? 'RESUMO DA UNIDADE // INDICADORES CHAVE DA SUA FILIAL' : 'RESUMO CONSOLIDADO // 7 INDICADORES CHAVE DA REDE'}</span>
          </div>

          {/* Period View Switcher */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0C1C2B] p-1 rounded-xl border border-[#C8A45D]/30 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPeriodoView('CICLO_ATIVO')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                periodoView === 'CICLO_ATIVO'
                  ? 'bg-[#C8A45D] text-black shadow-[0_0_10px_#C8A45D]'
                  : 'text-[#E8D6B5] hover:bg-[#0C1F31]/90/5'
              }`}
            >
              📅 Ciclo da Semana (Seg a Sáb)
            </button>
            <button
              type="button"
              onClick={() => setPeriodoView('HISTORICO_TOTAL')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                periodoView === 'HISTORICO_TOTAL'
                  ? 'bg-[#C8A45D] text-black shadow-[0_0_10px_#C8A45D]'
                  : 'text-[#E8D6B5] hover:bg-[#0C1F31]/90/5'
              }`}
            >
              🌐 Acumulado Geral
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Quantidade de Serviços Realizados */}
          <div 
            onClick={() => onNavigate('APROVACOES')}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-[#D9B76C] shadow-sm transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[#A8B8CC] mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                1. Serviços Realizados
              </span>
              <div className="w-9 h-9 flex items-center justify-center text-[#D8B56B] group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[var(--nexus-text)] font-mono tracking-tight">
              {totalServicosRealizados}
            </div>
            <div className="text-[11px] text-[#E8D6B5]/80 mt-2 flex items-center justify-between">
              <span>{isGerente ? 'Atendimentos da sua filial' : 'Soma de todas as filiais'}</span>
              <span className="text-[10px] font-mono text-[#D7C08E] bg-[#C8A45D]/15 px-2 py-0.5 rounded border border-[#C8A45D]/30">
                Atendimentos
              </span>
            </div>
          </div>

          {/* 2. Valor Bruto */}
          <div 
            onClick={() => onNavigate('RELATORIOS')}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-[#D9B76C] shadow-sm transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[#A8B8CC] mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                2. Valor Bruto Total
              </span>
              <div className="w-9 h-9 flex items-center justify-center text-emerald-500 group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--nexus-text)] font-mono tracking-tight">
              {fmtVal(totalValorBruto)}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-2 flex items-center justify-between">
              <span>Faturamento integral</span>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                100% Bruto
              </span>
            </div>
          </div>

          {/* 3. Comissões a Pagar */}
          <div 
            onClick={() => currentUser.role === 'ADMIN' ? onNavigate('PAGAMENTOS') : onNavigate('RELATORIOS')}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-[#D9B76C] shadow-sm transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[#A8B8CC] mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                3. Comissões a Pagar
              </span>
              <div className="w-9 h-9 flex items-center justify-center text-amber-500 group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--nexus-text)] font-mono tracking-tight">
              {fmtVal(totalComissoesAPagar)}
            </div>
            <div className="text-[11px] text-[#D7C08E] mt-2 flex items-center justify-between">
              <span>Repasses da equipe</span>
              <span className="text-[10px] font-mono bg-[#C8A45D]/15 text-[#F1DEB5] px-2 py-0.5 rounded border border-[#C8A45D]/30">
                {totalValorBruto > 0 ? `${Math.round((totalComissoesAPagar / totalValorBruto) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* 4. Valor Líquido (Descontando Comissões) */}
          <div 
            onClick={() => onNavigate('RELATORIOS')}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-emerald-400 shadow-sm transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[#A8B8CC] mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                4. Valor Líquido (Salão)
              </span>
              <div className="w-9 h-9 flex items-center justify-center text-emerald-500 group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
              {fmtVal(totalValorLiquido)}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-2 flex items-center justify-between">
              <span>Bruto - Comissões</span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/50 font-bold">
                Líquido Salão
              </span>
            </div>
          </div>

        </div>

        {/* Structural Metrics Row: Filiais, Funcionários e Gerente with 3D Icons, Soft Glow & Hover Zoom */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-3.5">
          
          {/* 5. Quantidade de Filiais */}
          <div 
            onClick={() => currentUser.role === 'ADMIN' && onNavigate('FILIAIS')}
            className={`p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] transition-all group shadow-sm flex items-center justify-between ${currentUser.role === 'ADMIN' ? 'hover:border-[#D9B76C] cursor-pointer' : ''}`}
          >
            <div>
              <span className="text-[10px] font-mono text-[#A8B8CC] uppercase block">
                {isGerente ? '5. Sua Filial' : '5. Quantidade de Filiais'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-[var(--nexus-text)] mt-0.5 truncate max-w-[180px]">
                {isGerente ? (currentFilial?.name || '1 Unidade') : `${totalFiliaisCount} Filiais`}
              </div>
              <span className="text-[10px] text-[#D7C08E]">
                {isGerente ? `${currentFilial?.city || 'Unidade'} / ${currentFilial?.state || 'Vinculada'}` : 'Unidades ativas na rede'}
              </span>
            </div>
            <div className="shrink-0 flex items-center justify-center">
              {config.menuCustomizations?.FILIAIS?.customImageUrl ? (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={config.menuCustomizations.FILIAIS.customImageUrl}
                    alt="Filiais"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={filiaisIcon}
                    alt="Filiais"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 6. Quantidade de Funcionários / Profissionais */}
          <div 
            onClick={() => onNavigate('VENDEDORES')}
            className="p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] hover:border-[#D9B76C] transition-all cursor-pointer group shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-mono text-[#A8B8CC] uppercase block">
                {isGerente ? '6. Equipe da Unidade' : '6. Funcionários / Profissionais'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[var(--nexus-text)] mt-0.5">{totalFuncionariosCount}</div>
              <span className="text-[10px] text-[#D7C08E]">
                {isGerente ? 'Profissionais da sua filial' : 'Cabeleireiros, manicures, barbeiros'}
              </span>
            </div>
            <div className="shrink-0 flex items-center justify-center">
              {config.menuCustomizations?.VENDEDORES?.customImageUrl ? (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={config.menuCustomizations.VENDEDORES.customImageUrl}
                    alt="Funcionários"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={employeesIcon}
                    alt="Funcionários"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 7. Quantidade de Gerentes */}
          <div 
            onClick={() => currentUser.role === 'ADMIN' && onNavigate('GERENTES')}
            className={`p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] transition-all group shadow-sm flex items-center justify-between ${currentUser.role === 'ADMIN' ? 'hover:border-[#D9B76C] cursor-pointer' : ''}`}
          >
            <div>
              <span className="text-[10px] font-mono text-[#A8B8CC] uppercase block">
                {isGerente ? '7. Gestor da Filial' : '7. Quantidade de Gerentes'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[var(--nexus-text)] mt-0.5">{totalGerentesCount}</div>
              <span className="text-[10px] text-[#D7C08E]">
                {isGerente ? 'Líder responsável pela unidade' : 'Líderes e gestores de filiais'}
              </span>
            </div>
            <div className="shrink-0 flex items-center justify-center">
              {config.menuCustomizations?.GERENTES?.customImageUrl ? (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={config.menuCustomizations.GERENTES.customImageUrl}
                    alt="Gerentes"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out drop-shadow-[0_4px_18px_rgba(255,90,0,0.7)]">
                  <img
                    src={gerentesIcon}
                    alt="Gerentes"
                    className="w-11 h-11 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 8. Status do Sistema (Preenche o espaço vazio da grade) */}
          <div className="p-4 rounded-2xl bg-[var(--nexus-card-bg)] border border-[var(--nexus-border)] shadow-sm flex items-center justify-between group overflow-hidden relative">
            <div className="absolute inset-0 bg-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <span className="text-[10px] font-mono text-emerald-600 uppercase block tracking-wider flex items-center gap-1.5 mb-1">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Sistema BomCorte
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5 tracking-tight">
                ONLINE
              </div>
              <span className="text-[10px] text-emerald-200/50 mt-1 block">
                Sincronização Ativa
              </span>
            </div>
            <div className="relative z-10 shrink-0 w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>

        </div>

        {/* Empty row space for removed elements */}
      </div>

      {/* ========================================================= */}
      {/* SECTION: ALTERAÇÃO DE QUANTIDADE E VALOR DE SERVIÇOS */}
      {/* ========================================================= */}
      <div className="p-5 rounded-3xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.7)] space-y-4">
        
        {/* Header & Title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#C8A45D]/20 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#C8A45D]" />
              Atendimentos Recentes & Edição Operacional (Qtd & Valor)
            </h3>
            <p className="text-xs text-[#B49A73]">
              Filtre por filial, visualize alertas/notificações e altere quantidade/valor cobrado com recálculo automático.
            </p>
          </div>

          {/* Quick Stats / Filter Counters */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setOnlyWithNotification(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyWithNotification
                  ? 'bg-gradient-to-r from-amber-500 to-[#C8A45D] text-white border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                  : totalNotificacoesCount > 0
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-[#10283D] border-[#C8A45D]/30 text-[#E8D6B5]/80 hover:text-white'
              }`}
              title="Filtrar pedidos com notificações ativas"
            >
              <Bell className={`w-3.5 h-3.5 ${totalNotificacoesCount > 0 ? 'animate-bounce text-amber-300' : ''}`} />
              <span>Com Notificação</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                onlyWithNotification ? 'bg-black/50 text-white' : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
              }`}>
                {totalNotificacoesCount}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#140702] border border-[#C8A45D]/25">
          {/* Filial Filter */}
          {!isGerente && currentUser.role === 'ADMIN' ? (
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#C8A45D]" />
                <span>Filtrar por Filial</span>
              </label>
              <select
                value={tableFilialFilter}
                onChange={(e) => setTableFilialFilter(e.target.value)}
                className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D8B56B] font-medium cursor-pointer"
              >
                <option value="ALL">🌐 Todas as Filiais ({filiais.length})</option>
                {filiais.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.city || 'Unidade'})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#C8A45D]" />
                <span>Filial</span>
              </label>
              <div className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-[#E8D6B5] text-xs rounded-xl px-3 py-2 flex items-center gap-2 opacity-80 cursor-not-allowed">
                 <Lock className="w-3.5 h-3.5 text-[#C8A45D]" />
                 <span>{currentFilial?.name || 'Sua Filial'}</span>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-mono text-[#D7C08E] mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#C8A45D]" />
              <span>Filtrar por Status</span>
            </label>
            <select
              value={tableStatusFilter}
              onChange={(e) => setTableStatusFilter(e.target.value)}
              className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D8B56B] font-medium cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="APROVADO">Aprovados</option>
              <option value="REPROVADO">Reprovados</option>
              <option value="PAGO">Pagos</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-mono text-[#D7C08E] mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-[#C8A45D]" />
              <span>Busca Rápida</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
              <input
                type="text"
                placeholder="Profissional, serviço, filial ou aviso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#10283D] border border-[#C8A45D]/40 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D8B56B] placeholder-[#B49A73]/50"
              />
            </div>
          </div>
        </div>

        {/* Service Records Table */}
        <div className="relative rounded-2xl border border-[#C8A45D]/20 overflow-hidden">
          <div className={`overflow-x-auto custom-scrollbar pb-2 ${recentServices.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
            <table className="min-w-[1100px] w-full text-left text-[10px] text-white table-fixed">
              <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${recentServices.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                <tr>
                  <th className="py-3 px-2 text-left">Data/Hora</th>
                  <th className="py-3 px-2 text-left">Filial</th>
                  <th className="py-3 px-2 text-left">Profissional</th>
                  <th className="py-3 px-2 text-left">Serviço</th>
                  <th className="py-3 px-2 text-center">Qtd.</th>
                  <th className="py-3 px-2 text-left">Total</th>
                  <th className="py-3 px-2 text-left">Comissão %</th>
                  <th className="py-3 px-2 text-left">Comissão</th>
                  <th className="py-3 px-2 text-left">Status</th>
                  <th className="py-3 px-2 text-center">Notificação</th>
                  <th className="py-3 px-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8A45D]/10">
                {recentServices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-[#B49A73]">
                      Nenhum atendimento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  recentServices.map((r) => {
                    const vend = users.find(u => u.id === r.vendedorId);
                    const filial = filiais.find(f => f.id === r.filialId);
                    const serv = servicos.find(s => s.id === r.servicoId);
                    const qty = r.quantidade || 1;
                    const hasNotif = hasOrderNotification(r);

                    return (
                      <tr key={r.id} className="hover:bg-[#C8A45D]/5 transition-colors align-top">
                        <td className="py-3 px-2 font-mono text-[#B49A73] whitespace-nowrap">
                          {new Date(r.dataHora).toLocaleDateString('pt-BR')} {new Date(r.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 text-[#E8D6B5]/90 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#10283D] border border-[#C8A45D]/25 text-[10px]">
                            {filial?.name || 'Filial'}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-white whitespace-nowrap">
                          {vend?.name || 'Profissional'}
                        </td>
                        <td className="py-3 px-2 text-white">
                          {serv?.name || 'Serviço'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-[#F1DEB5] whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#10283D] border border-[#C8A45D]/30">
                            {qty}x
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-white font-bold whitespace-nowrap">
                          {formatCurrency(r.valorCobrado)}
                        </td>
                        <td className="py-3 px-2 font-mono text-[#F1DEB5] whitespace-nowrap">
                          {r.commissionPercent}%
                        </td>
                        <td className="py-3 px-2 font-mono text-[#F1DEB5] font-bold whitespace-nowrap">
                          {formatCurrency(r.valorComissao)}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            r.status === 'APROVADO'
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                              : r.status === 'PENDENTE'
                              ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                              : r.status === 'PAGO'
                              ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                              : 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {hasNotif ? (
                            <button
                              onClick={() => setNotificacaoModalRecord(r)}
                              className="relative px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-[#C8A45D]/35 to-amber-500/25 text-amber-300 border-2 border-amber-400 font-bold text-[10px] inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:brightness-125 active:scale-95 transition-all cursor-pointer"
                              title={r.notificacao ? `Notificação: ${r.notificacao}` : 'Ver alertas e notificações do pedido'}
                            >
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                              <Bell className="w-3.5 h-3.5 text-amber-300" />
                              <span className="max-w-[90px] truncate text-[9px] font-mono">
                                {r.notificacao ? 'Aviso' : r.motivoReprovacao ? 'Reprovação' : 'Alterado'}
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setNotificacaoModalRecord(r)}
                              className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E]/70 hover:text-white hover:bg-[#C8A45D]/20 border border-[#C8A45D]/15 hover:border-[#C8A45D]/40 transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px]"
                              title="Adicionar Notificação ao Pedido"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-mono">Aviso</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {(() => {
                              const isBlocked = r.status === 'PAGO' || r.status === 'REPROVADO';
                              return (
                                <button
                                  onClick={() => !isBlocked && handleOpenEdit(r)}
                                  disabled={isBlocked}
                                  className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] transition-all inline-flex items-center gap-1 ${
                                    isBlocked
                                      ? 'opacity-35 bg-[#0C1C2B]/70 border-[#C8A45D]/15 text-[#9a7b6c] cursor-not-allowed shadow-none'
                                      : 'bg-[#C8A45D]/20 hover:bg-[#C8A45D] text-[#F1DEB5] hover:text-white border-[#C8A45D]/40 cursor-pointer shadow-[0_0_10px_rgba(255,90,0,0.2)] active:scale-95'
                                  }`}
                                  title={
                                    isBlocked
                                      ? `Não é permitido alterar quantidade/valor de atendimentos com status ${r.status}.`
                                      : 'Alterar Quantidade e Valor'
                                  }
                                >
                                  {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                  <span>Alterar</span>
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Indicador de rolagem para mobile */}
          <div className="md:hidden w-full bg-gradient-to-r from-amber-600/80 via-[#C8A45D] to-amber-600/80 text-black text-center py-2 text-xs font-black uppercase tracking-widest rounded-b-2xl flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(200,164,93,0.6)] animate-pulse">
            <span className="text-lg">⟷</span>
            Deslize para os lados para ver a tabela completa
            <span className="text-lg">⟷</span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* CONSOLIDADO DE FATURAMENTO MENSAL DA REDE */}
      {/* ========================================================= */}
      <MonthlyRevenueConsolidation
        filiais={filiais}
        registros={allRegistros}
        pagamentos={allPagamentos}
        users={users}
        currentUser={currentUser}
      />

      {/* Edit Service Modal */}
      <EditServiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        record={editingRecord}
        currentUser={currentUser}
        onSaved={reloadData}
      />

      {/* Pedido Notificação Modal */}
      {notificacaoModalRecord && (
        <PedidoNotificacaoModal
          record={notificacaoModalRecord}
          currentUser={currentUser}
          filiais={filiais}
          users={users}
          servicos={servicos}
          onClose={() => setNotificacaoModalRecord(null)}
          onUpdated={() => {
            setNotificacaoModalRecord(null);
            reloadData();
          }}
        />
      )}

    </div>
  );
};
