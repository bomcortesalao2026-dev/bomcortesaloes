import React, { useMemo } from 'react';
import { 
  Scissors, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  Building2, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Calendar,
  Lock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { User, ActiveModule, RegistroServico, Vale, Servico } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';
import { WeekCycleBadge } from './WeekCycleBadge';

interface VendedorDashboardProps {
  currentUser: User;
  onNavigate: (module: ActiveModule) => void;
}

export const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ currentUser, onNavigate }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [isRefreshingVd, setIsRefreshingVd] = React.useState(false);
  const [lastRefreshVd, setLastRefreshVd] = React.useState('');

  React.useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshVd();
    };
    forceRefreshVd();
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => document.removeEventListener('visibilitychange', refreshOnReturn);
  }, []);

  const forceRefreshVd = async () => {
    setIsRefreshingVd(true);
    try {
      await StorageService.refreshForScreen('EMPLOYEE');
      setRefreshTrigger(prev => prev + 1);
      setLastRefreshVd(new Date().toLocaleTimeString('pt-BR'));
    } finally {
      setIsRefreshingVd(false);
    }
  };

  const filiais = useMemo(() => StorageService.getFiliais(), [refreshTrigger]);
  const servicos = useMemo(() => StorageService.getServicos(), [refreshTrigger]);
  
  // Filter records and vales exclusively for this professional
  const userRegistros = useMemo(() => {
    return StorageService.getRegistrosServicos().filter(r => r.vendedorId === currentUser.id);
  }, [currentUser.id, refreshTrigger]);

  const userVales = useMemo(() => {
    return StorageService.getVales().filter(v => v.vendedorId === currentUser.id);
  }, [currentUser.id, refreshTrigger]);

  const assignedFilial = useMemo(() => {
    return filiais.find(f => f.id === currentUser.filialId) || filiais[0];
  }, [filiais, currentUser.filialId]);

  // 1. QUANTIDADE DE SERVIÇOS (Apenas os APROVADOS que ainda não foram pagos)
  const activeRegistros = useMemo(() => {
    return userRegistros.filter(r => r.status === 'APROVADO');
  }, [userRegistros]);

  const totalQuantidadeServicos = useMemo(() => {
    return activeRegistros.reduce((sum, r) => sum + (r.quantidade || 1), 0);
  }, [activeRegistros]);

  // 2. VALOR BRUTO (Apenas serviços APROVADOS)
  const totalValorBruto = useMemo(() => {
    return activeRegistros.reduce((sum, r) => sum + (r.valorCobrado || 0), 0);
  }, [activeRegistros]);

  // Total de Comissões Brutas geradas (Apenas APROVADAS)
  const totalComissoesBrutas = useMemo(() => {
    return activeRegistros.reduce((sum, r) => sum + (r.valorComissao || 0), 0);
  }, [activeRegistros]);

  // 3. VALES (Apenas os APROVADOS que ainda não foram descontados)
  const activeVales = useMemo(() => {
    return userVales.filter(v => v.status === 'APROVADO');
  }, [userVales]);

  const totalVales = useMemo(() => {
    return activeVales.reduce((sum, v) => sum + (v.valor || 0), 0);
  }, [activeVales]);

  // Vales já aprovados especificamente (mas não descontados)
  const totalValesAprovados = useMemo(() => {
    return activeVales.filter(v => v.status === 'APROVADO').reduce((sum, v) => sum + (v.valor || 0), 0);
  }, [activeVales]);

  // 4. VALOR LÍQUIDO (Já descontando os vales feitos)
  // Calculado a partir das comissões brutas geradas menos o total de vales (permite saldo negativo real)
  const totalValorLiquidoComissao = useMemo(() => {
    return totalComissoesBrutas - totalVales;
  }, [totalComissoesBrutas, totalVales]);

  const isSaldoNegativo = totalValorLiquidoComissao < 0;

  // Valor Bruto de Serviços menos Vales
  const totalValorBrutoMenosVales = useMemo(() => {
    return totalValorBruto - totalVales;
  }, [totalValorBruto, totalVales]);

  // Recent 5 services
  const recentServices = useMemo(() => {
    return [...userRegistros].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()).slice(0, 5);
  }, [userRegistros]);

  // Recent 3 vales
  const recentVales = useMemo(() => {
    return [...userVales].sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime()).slice(0, 3);
  }, [userVales]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Banner de Alerta Piscando quando o Saldo estiver Negativo */}
      {isSaldoNegativo && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/95 via-[#1B2633] to-[#0B1723] border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-950/400/25 border-2 border-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.7)]">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            </div>
            <div>
              <div className="font-black text-rose-200 text-sm flex items-center gap-2 tracking-wide">
                <span>⚠️ ATENÇÃO: VOCÊ ESTÁ COM SALDO NEGATIVO</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-xs">
                  {formatCurrency(totalValorLiquidoComissao)}
                </span>
              </div>
              <div className="text-rose-300/90 text-[11px] mt-0.5">
                O total de vales solicitados ({formatCurrency(totalVales)}) ultrapassou suas comissões acumuladas ({formatCurrency(totalComissoesBrutas)}). Novos lançamentos de serviços abaterão esse débito.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('REGISTRAR_SERVICO')}
            className="px-4 py-2.5 rounded-xl bg-rose-950/400 hover:bg-rose-400 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer self-end sm:self-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.5)] active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lançar Atendimento</span>
          </button>
        </div>
      )}

      {/* Top Banner with Fixed Filial Identification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0C1F31]/90 border border-[#C8A45D]/25 shadow-[0_4px_20px_rgba(255,90,0,0.08)] relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D9B76C]">
            <Sparkles className="w-4 h-4 text-[#C8A45D]" />
            <span>PAINEL DO PROFISSIONAL</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#E8EDF5] tracking-wide">
            Olá, {currentUser.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Locked Filial Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D2133]/80 border border-[#D9B76C]/30 text-[#705A2B] text-xs font-mono">
              <Building2 className="w-3.5 h-3.5 text-[#C8A45D]" />
              <span>Filial: <strong>{assignedFilial?.name || 'Unidade Principal'}</strong></span>
              <Lock className="w-3 h-3 text-[#D8B56B] ml-1" title="Filial vinculada ao seu usuário" />
            </div>
            <span className="text-[11px] text-[#6B7F96] font-mono">
              Cargo: {currentUser.funcao || 'Profissional'}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-black/30 border border-[#C8A45D]/20">
            <button
              onClick={forceRefreshVd}
              disabled={isRefreshingVd}
              className="p-1 rounded-lg text-[#C8A45D] hover:text-[#9B772D] hover:bg-[#C8A45D]/15 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              title={lastRefreshVd ? `Atualizado às ${lastRefreshVd}` : 'Atualizar dados'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingVd ? 'animate-spin' : ''}`} />
            </button>
            {lastRefreshVd && (
              <span className="text-[10px] font-mono text-[#705A2B] pr-1">{lastRefreshVd}</span>
            )}
          </div>
          <button
            onClick={() => onNavigate('REGISTRAR_SERVICO')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white text-xs font-bold shadow-[0_2px_12px_rgba(255,90,0,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Serviço</span>
          </button>
          <button
            onClick={() => onNavigate('SOLICITAR_VALE')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0D2133]/80 border border-[#C8A45D]/30 text-[#705A2B] hover:text-[#9B772D] hover:border-[#D9B76C] text-xs font-semibold transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-[#C8A45D]" />
            <span>Pedir Vale</span>
          </button>
        </div>
      </div>

      {/* Week Cycle Indicator (Monday to Saturday) */}
      <WeekCycleBadge />

      {/* AS 4 MÉTRICAS: Quantidade de Serviços, Valor Bruto, Vales, Valor Líquido */}
      <div>
        <div className="text-xs font-mono text-[#6B7F96] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#C8A45D]" />
          <span>RESUMO FINANCEIRO INDIVIDUAL</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. QUANTIDADE DE SERVIÇOS */}
          <div 
            onClick={() => onNavigate('MEUS_SERVICOS')}
            className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 hover:border-[#D9B76C]/50 transition-all cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#6B7F96] mb-2">
                <span className="text-[11px] font-mono tracking-wider uppercase font-bold">Quantidade de Serviços</span>
                <div className="w-8 h-8 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                  <Scissors className="w-5 h-5 text-[#C8A45D]" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#E8EDF5] font-mono">{totalQuantidadeServicos}</div>
              <div className="text-[11px] text-[#6B7F96] mt-1 font-mono">
                {userRegistros.length} lançamentos registrados
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8A45D]/15 flex items-center justify-between text-[10px] text-[#6B7F96]">
              <span>Ver atendimentos</span>
              <ArrowRight className="w-3 h-3 text-[#C8A45D] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. VALOR BRUTO */}
          <div 
            onClick={() => onNavigate('MINHAS_COMISSOES')}
            className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 hover:border-[#D9B76C]/50 transition-all cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#6B7F96] mb-2">
                <span className="text-[11px] font-mono tracking-wider uppercase font-bold">Valor Bruto</span>
                <div className="w-8 h-8 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#E8EDF5] font-mono">
                {formatCurrency(totalValorBruto)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1 font-mono">
                Comissão bruta: {formatCurrency(totalComissoesBrutas)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8A45D]/15 flex items-center justify-between text-[10px] text-[#6B7F96]">
              <span>Total faturado nos serviços</span>
              <ArrowRight className="w-3 h-3 text-[#C8A45D] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. VALES */}
          <div 
            onClick={() => onNavigate('MEUS_VALES')}
            className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 hover:border-[#D9B76C]/50 transition-all cursor-pointer group shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#6B7F96] mb-2">
                <span className="text-[11px] font-mono tracking-wider uppercase font-bold">Vales</span>
                <div className="w-8 h-8 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                {formatCurrency(totalVales)}
              </div>
              <div className="text-[11px] text-[#6B7F96] mt-1 font-mono">
                {userVales.length} adiantamento(s) solicitado(s)
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8A45D]/15 flex items-center justify-between text-[10px] text-[#6B7F96]">
              <span>Gerenciar vales</span>
              <ArrowRight className="w-3 h-3 text-[#C8A45D] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. VALOR LÍQUIDO (Piscando em vermelho caso negativo) */}
          <div 
            onClick={() => onNavigate('MINHAS_COMISSOES')}
            className={`p-5 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between ${
              isSaldoNegativo
                ? 'bg-rose-950/40 border-2 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:border-rose-500 animate-pulse'
                : 'bg-[#0C1F31]/90 border-2 border-[#D9B76C]/40 hover:border-[#C8A45D]/70 shadow-[0_2px_12px_rgba(255,90,0,0.1)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-mono tracking-wider uppercase font-bold ${
                  isSaldoNegativo ? 'text-rose-600' : 'text-[#6B7F96]'
                }`}>
                  Valor Líquido
                </span>
                <div className="w-8 h-8 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 ease-out shrink-0">
                  {isSaldoNegativo ? (
                    <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                  ) : (
                    <Wallet className="w-5 h-5 text-[#C8A45D]" />
                  )}
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                isSaldoNegativo ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
              }`}>
                {formatCurrency(totalValorLiquidoComissao)}
              </div>
              <div className={`text-[11px] mt-1 font-mono ${
                isSaldoNegativo ? 'text-rose-500 font-semibold' : 'text-[#6B7F96]'
              }`}>
                Comissões ({formatCurrency(totalComissoesBrutas)}) - Vales ({formatCurrency(totalVales)})
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[10px] font-bold ${
              isSaldoNegativo 
                ? 'border-rose-400/40 text-rose-600' 
                : 'border-[#C8A45D]/20 text-emerald-600'
            }`}>
              <span>{isSaldoNegativo ? '⚠️ SALDO NEGATIVO (EM DÉBITO)' : 'Saldo líquido a receber'}</span>
              <ArrowRight className={`w-3 h-3 group-hover:translate-x-1 transition-transform ${
                isSaldoNegativo ? 'text-rose-500' : 'text-[#C8A45D]'
              }`} />
            </div>
          </div>

        </div>
      </div>

      {/* RECENT SERVICES & RECENT VALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Services List */}
        <div className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#C8A45D]/15 pb-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#C8A45D]" />
              <h3 className="text-sm font-bold text-[#E8EDF5] uppercase tracking-wider font-mono">
                Últimos Serviços Registrados
              </h3>
            </div>
            <button
              onClick={() => onNavigate('MEUS_SERVICOS')}
              className="text-xs text-[#C8A45D] hover:text-[#9B772D] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentServices.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6B7F96]">
              Nenhum serviço registrado ainda.
              <div className="mt-2">
                <button
                  onClick={() => onNavigate('REGISTRAR_SERVICO')}
                  className="px-3 py-1.5 rounded-lg bg-[#C8A45D]/10 border border-[#C8A45D]/30 text-[#9B772D] text-xs font-bold hover:bg-[#C8A45D]/20 cursor-pointer"
                >
                  + Lançar Primeiro Atendimento
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentServices.map((r) => {
                const s = servicos.find(srv => srv.id === r.servicoId);
                return (
                  <div key={r.id} className="p-3 rounded-xl bg-[#0D2133]/80 border border-[#C8A45D]/12 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <div className="font-bold text-[#E8EDF5] truncate flex items-center gap-2">
                        <span>{s?.name || 'Serviço'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#C8A45D]/15 text-[#9B772D] text-[10px] font-mono">
                          {r.quantidade || 1}x
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7F96] truncate mt-0.5">
                        {new Date(r.dataHora).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-[#E8EDF5] font-bold">{formatCurrency(r.valorCobrado)}</div>
                      <div className="text-[10px] text-emerald-600">Comissão: {formatCurrency(r.valorComissao)}</div>
                      <div className="mt-0.5">
                        {r.status === 'PENDENTE' && <span className="badge-pendente-alerta">⚠ PENDENTE</span>}
                        {r.status === 'APROVADO' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 uppercase font-black">APROVADO</span>}
                        {r.status === 'REPROVADO' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-500/50 uppercase font-black">REPROVADO</span>}
                        {r.status === 'PAGO' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-500/50 uppercase font-black">PAGO</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Vales List */}
        <div className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/20 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#C8A45D]/15 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#C8A45D]" />
              <h3 className="text-sm font-bold text-[#E8EDF5] uppercase tracking-wider font-mono">
                Histórico Recente de Vales
              </h3>
            </div>
            <button
              onClick={() => onNavigate('MEUS_VALES')}
              className="text-xs text-[#C8A45D] hover:text-[#9B772D] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentVales.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6B7F96]">
              Nenhum vale solicitado.
              <div className="mt-2">
                <button
                  onClick={() => onNavigate('SOLICITAR_VALE')}
                  className="px-3 py-1.5 rounded-lg bg-[#C8A45D]/10 border border-[#C8A45D]/30 text-[#9B772D] text-xs font-bold hover:bg-[#C8A45D]/20 cursor-pointer"
                >
                  Solicitar Adiantamento
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentVales.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-[#0D2133]/80 border border-[#C8A45D]/12 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#E8EDF5] font-mono">{formatCurrency(v.valor)}</div>
                    <div className="text-[11px] text-[#6B7F96] truncate mt-0.5 max-w-[200px]">
                      {v.motivo}
                    </div>
                    <div className="text-[10px] text-[#c06030]/70 font-mono mt-0.5">
                      {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {v.status === 'PENDENTE' && <span className="badge-pendente-alerta">⚠ PENDENTE</span>}
                    {v.status === 'APROVADO' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 font-mono uppercase font-black">APROVADO</span>}
                    {v.status === 'REPROVADO' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-950/40 text-rose-400 border border-rose-500/50 font-mono uppercase font-black">REPROVADO</span>}
                    {v.status === 'DESCONTADO' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-950/40 text-sky-400 border border-sky-500/50 font-mono uppercase font-black">DESCONTADO</span>}
                    {v.status === 'PAGO' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-950/40 text-sky-400 border border-sky-500/50 font-mono uppercase font-black">PAGO</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => onNavigate('SOLICITAR_VALE')}
              className="w-full py-2 rounded-xl bg-[#0D2133]/80 border border-[#C8A45D]/25 hover:border-[#D9B76C]/50 text-[#705A2B] text-xs font-semibold hover:text-[#9B772D] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#C8A45D]" />
              <span>Solicitar Novo Adiantamento / Vale</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
