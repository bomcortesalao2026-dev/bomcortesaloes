import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  FileText, 
  Printer, 
  Download, 
  Sparkles,
  ArrowRight,
  Eye,
  CheckCheck,
  X,
  AlertCircle,
  AlertTriangle,
  Clock,
  Check,
  Filter,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, Filial, Servico, RegistroServico, Vale, PagamentoSemanal, AuditoriaLog } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency, printStyledReport, exportToCsv, formatDate } from '../utils/exportUtils';
import { calculateWeekCycle } from '../utils/dateCycleUtils';
import { WeekCycleBadge } from './WeekCycleBadge';

interface PagamentosModuleProps {
  currentUser: User;
}

interface StylistSettlementPreview {
  vendedor: User;
  filial: Filial | undefined;
  approvedServices: RegistroServico[];
  activeVales: Vale[];
  totalComissaoBruta: number;
  totalVales: number;
  valorLiquido: number;
  formaPagamento: 'PIX' | 'TRANSFERENCIA' | 'DINHEIRO' | 'OUTRO';
  observacoes: string;
}

export const PagamentosModule: React.FC<PagamentosModuleProps> = ({ currentUser }) => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoSemanal[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaLog[]>([]);

  // Filter params for settlement
  const [selectedFilialId, setSelectedFilialId] = useState<string>(
    currentUser.role === 'GERENTE' ? (currentUser.filialId || 'filial-1') : 'ALL'
  );

  // Filter param for history
  const [selectedHistoryFilialId, setSelectedHistoryFilialId] = useState<string>(
    currentUser.role === 'GERENTE' ? (currentUser.filialId || 'filial-1') : 'ALL'
  );
  
  // Filter mode: 'ALL_UNPAID' includes all approved records not yet paid; 'CUSTOM_RANGE' restricts by date
  const [filterMode, setFilterMode] = useState<'ALL_UNPAID' | 'CUSTOM_RANGE'>('ALL_UNPAID');

  const [periodoInicio, setPeriodoInicio] = useState<string>(() => {
    return calculateWeekCycle(new Date()).startDateStr;
  });
  const [periodoFim, setPeriodoFim] = useState<string>(() => {
    return calculateWeekCycle(new Date()).endDateStr;
  });

  // Settlement previews for vendors
  const [settlementList, setSettlementList] = useState<StylistSettlementPreview[]>([]);
  const [selectedPreviewServices, setSelectedPreviewServices] = useState<StylistSettlementPreview | null>(null);

  // In-app Modal Confirmation states (replacing window.confirm to avoid iframe blocking bugs)
  const [confirmingPayment, setConfirmingPayment] = useState<StylistSettlementPreview | null>(null);
  const [confirmingPayAll, setConfirmingPayAll] = useState<boolean>(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<{
    message: string;
    lastPayment?: PagamentoSemanal;
  } | null>(null);

  const refreshData = () => {
    const fList = StorageService.getFiliais();
    const uList = StorageService.getUsers();
    const sList = StorageService.getServicos();
    const rList = StorageService.getRegistrosServicos();
    const vList = StorageService.getVales();
    const pList = StorageService.getPagamentos();
    const aList = StorageService.getAuditoria();

    setFiliais(fList);
    setUsers(uList);
    setServicos(sList);
    setRegistros(rList);
    setVales(vList);
    setPagamentos(pList);
    setAuditoria(aList);

    if (currentUser.role === 'GERENTE' && currentUser.filialId) {
      setSelectedFilialId(currentUser.filialId);
    }
  };

  const [isRefreshingPg, setIsRefreshingPg] = useState<boolean>(false);

  const forceRefreshPg = async (force = true) => {
    if (isRefreshingPg) return;
    setIsRefreshingPg(true);
    try {
      await StorageService.refreshForScreen('PAYMENTS', force);
      refreshData();
    } finally {
      setTimeout(() => setIsRefreshingPg(false), 400);
    }
  };

  useEffect(() => {
    refreshData();
    forceRefreshPg();
  }, [currentUser]);

  useEffect(() => {
    const refreshAfterHistoryChange = () => refreshData();
    window.addEventListener('nexus_reset_historico', refreshAfterHistoryChange);
    window.addEventListener('nexus_realtime_data_updated', refreshAfterHistoryChange);
    return () => {
      window.removeEventListener('nexus_reset_historico', refreshAfterHistoryChange);
      window.removeEventListener('nexus_realtime_data_updated', refreshAfterHistoryChange);
    };
  }, [currentUser]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshPg(false);
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => document.removeEventListener('visibilitychange', refreshOnReturn);
  }, []);

  // Quick preset dates
  const handleSetDatePreset = (preset: 'ALL' | 'CYCLE_WEEK' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH') => {
    const now = new Date();
    if (preset === 'ALL') {
      setFilterMode('ALL_UNPAID');
      return;
    }

    setFilterMode('CUSTOM_RANGE');
    if (preset === 'CYCLE_WEEK') {
      const cycle = calculateWeekCycle(now);
      setPeriodoInicio(cycle.startDateStr);
      setPeriodoFim(cycle.endDateStr);
    } else if (preset === 'THIS_WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setPeriodoInicio(d.toISOString().slice(0, 10));
      setPeriodoFim(now.toISOString().slice(0, 10));
    } else if (preset === 'LAST_WEEK') {
      const prevWeekDate = new Date();
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      const cycle = calculateWeekCycle(prevWeekDate);
      setPeriodoInicio(cycle.startDateStr);
      setPeriodoFim(cycle.endDateStr);
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setPeriodoInicio(start.toISOString().slice(0, 10));
      setPeriodoFim(now.toISOString().slice(0, 10));
    }
  };

  // Recalculate settlement candidates when filters change
  useEffect(() => {
    const vendors = users.filter(u => {
      if (u.role !== 'VENDEDOR') return false;
      if (currentUser.role === 'GERENTE' && u.filialId !== currentUser.filialId) return false;
      if (selectedFilialId !== 'ALL' && u.filialId !== selectedFilialId) return false;
      return true;
    });

    const start = new Date(periodoInicio + 'T00:00:00').getTime();
    const end = new Date(periodoFim + 'T23:59:59').getTime();

    const previews: StylistSettlementPreview[] = vendors.map(v => {
      const vendFilial = filiais.find(f => f.id === v.filialId);
      
      // Approved services that are NOT yet PAGO
      const appServices = registros.filter(r => {
        if (r.vendedorId !== v.id || r.status !== 'APROVADO') return false;
        if (filterMode === 'CUSTOM_RANGE') {
          const time = new Date(r.dataHora).getTime();
          return time >= start && time <= end;
        }
        return true;
      });

      // Approved vales not yet deducted
      const appVales = vales.filter(vl => vl.vendedorId === v.id && vl.status === 'APROVADO');

      const totalBruto = appServices.reduce((sum, r) => sum + r.valorComissao, 0);
      const totalVal = appVales.reduce((sum, vl) => sum + vl.valor, 0);
      const liq = totalBruto - totalVal;

      return {
        vendedor: v,
        filial: vendFilial,
        approvedServices: appServices,
        activeVales: appVales,
        totalComissaoBruta: totalBruto,
        totalVales: totalVal,
        valorLiquido: liq,
        formaPagamento: 'PIX',
        observacoes: '',
      };
    }).filter(p => p.approvedServices.length > 0 || p.activeVales.length > 0);

    setSettlementList(previews);
  }, [periodoInicio, periodoFim, selectedFilialId, filterMode, registros, vales, users, filiais, currentUser]);

  const handleUpdatePaymentMethod = (vendedorId: string, forma: StylistSettlementPreview['formaPagamento']) => {
    setSettlementList(prev => prev.map(p => {
      if (p.vendedor.id === vendedorId) {
        return { ...p, formaPagamento: forma };
      }
      return p;
    }));
  };

  const handleUpdateObs = (vendedorId: string, obs: string) => {
    setSettlementList(prev => prev.map(p => {
      if (p.vendedor.id === vendedorId) {
        return { ...p, observacoes: obs };
      }
      return p;
    }));
  };

  // Quick Approval of Pending Services (helps user if they forgot to approve services first)
  const pendingCount = registros.filter(r => {
    if (r.status !== 'PENDENTE') return false;
    if (currentUser.role === 'GERENTE' && r.filialId !== currentUser.filialId) return false;
    if (selectedFilialId !== 'ALL' && r.filialId !== selectedFilialId) return false;
    return true;
  }).length;

  const handleApproveAllPending = () => {
    const pendingList = registros.filter(r => {
      if (r.status !== 'PENDENTE') return false;
      if (currentUser.role === 'GERENTE' && r.filialId !== currentUser.filialId) return false;
      if (selectedFilialId !== 'ALL' && r.filialId !== selectedFilialId) return false;
      return true;
    });

    pendingList.forEach(r => {
      StorageService.approveRegistro(r.id, currentUser);
    });

    try {
      confetti({ particleCount: 50, spread: 50, colors: ['#C8A45D', '#10b981', '#ffffff'] });
    } catch {}

    refreshData();
  };

  // Process single settlement
  const executePayIndividual = (preview: StylistSettlementPreview) => {
    if (preview.valorLiquido <= 0) return;

    const pInicio = periodoInicio;
    const pFim = periodoFim;

    const paid = StorageService.processarPagamentoSemanal(
      preview.vendedor.id,
      pInicio,
      pFim,
      preview.approvedServices.map(s => s.id),
      preview.activeVales.map(v => v.id),
      currentUser,
      {
        formaPagamento: preview.formaPagamento,
        observacoes: preview.observacoes,
      }
    );

    if (!paid) {
      alert('Este pagamento já foi processado ou os registros selecionados não estão mais disponíveis para pagamento. Atualize a tela e tente novamente.');
      forceRefreshPg();
      return;
    }

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        colors: ['#10b981', '#C8A45D', '#ffffff']
      });
    } catch {}

    setConfirmingPayment(null);
    setPaymentSuccessToast({
      message: `Pagamento de ${formatCurrency(preview.valorLiquido)} liquidado com sucesso para ${preview.vendedor.name}!`,
      lastPayment: paid,
    });

    refreshData();
  };

  // Process all eligible settlements
  const payableSettlements = settlementList.filter(p => p.valorLiquido > 0);
  const grandTotalLiquido = payableSettlements.reduce((sum, p) => sum + p.valorLiquido, 0);
  const grandTotalBruto = settlementList.reduce((sum, p) => sum + p.totalComissaoBruta, 0);
  const totalAcumuladoVales = pagamentos.reduce((sum, p) => sum + p.totalValesDescontados, 0);

  const executePayAll = () => {
    if (payableSettlements.length === 0) return;

    const pInicio = periodoInicio;
    const pFim = periodoFim;

    let pagosComSucesso = 0;
    payableSettlements.forEach(preview => {
      const paid = StorageService.processarPagamentoSemanal(
        preview.vendedor.id,
        pInicio,
        pFim,
        preview.approvedServices.map(s => s.id),
        preview.activeVales.map(v => v.id),
        currentUser,
        {
          formaPagamento: preview.formaPagamento,
          observacoes: preview.observacoes,
        }
      );
      if (paid) pagosComSucesso++;
    });

    try {
      confetti({
        particleCount: 140,
        spread: 90,
        colors: ['#10b981', '#D9B76C', '#ffffff']
      });
    } catch {}

    setConfirmingPayAll(false);
    setPaymentSuccessToast({
      message: pagosComSucesso > 0
        ? `Fechamento concluído! ${pagosComSucesso} profissional(is) liquidado(s) (Total previsto: ${formatCurrency(grandTotalLiquido)}).`
        : 'Nenhum pagamento foi processado. Os registros podem já ter sido liquidados; a tela foi atualizada.',
    });

    refreshData();
    forceRefreshPg();
  };

  const historicoFiltrado = pagamentos.filter(p => {
    if (currentUser.role === 'GERENTE') {
      return p.filialId === currentUser.filialId;
    }
    return selectedHistoryFilialId === 'ALL' || p.filialId === selectedHistoryFilialId;
  });

  const getPaymentApprover = (pagamento: PagamentoSemanal) => {
    const servicosIds = pagamento.servicosIds || pagamento.servicoIds || [];
    const valesIds = pagamento.valesIds || pagamento.valeIds || [];
    const nomes = [
      ...registros.filter(r => servicosIds.includes(r.id) || r.weeklyPaymentId === pagamento.id)
        .map(r => r.aprovadoPorNome),
      ...vales.filter(v => valesIds.includes(v.id) || v.weeklyPaymentId === pagamento.id)
        .map(v => v.aprovadoPorNome),
    ].filter((nome): nome is string => Boolean(nome));
    const nomesUnicos = [...new Set(nomes)];
    return nomesUnicos.join(', ') || pagamento.aprovadoPorNome || 'Não registrado';
  };

  const getPaymentPayer = (pagamento: PagamentoSemanal) => {
    if (pagamento.pagoPorNome && pagamento.pagoPorNome !== 'Sistema (Recuperação Automática)') {
      return pagamento.pagoPorNome;
    }
    const servicosIds = pagamento.servicosIds || pagamento.servicoIds || [];
    const valesIds = pagamento.valesIds || pagamento.valeIds || [];
    const linkedPaymentIds = new Set([
      pagamento.id,
      ...registros.filter(r => servicosIds.includes(r.id)).map(r => r.weeklyPaymentId),
      ...vales.filter(v => valesIds.includes(v.id)).map(v => v.weeklyPaymentId),
    ].filter((id): id is string => Boolean(id)));
    const logPagamento = auditoria.find(log =>
      log.registroTipo === 'PAGAMENTO' &&
      linkedPaymentIds.has(log.registroId) &&
      log.acao === 'Fechamento Semanal / Pagamento'
    );
    return logPagamento?.usuarioNome || 'Não identificado (histórico recuperado)';
  };

  const handlePrintReceipt = (p: PagamentoSemanal) => {
    const vend = users.find(u => u.id === p.vendedorId);
    const filial = filiais.find(f => f.id === p.filialId);
    const currentConfig = StorageService.getConfig();
    const salonName = currentConfig.salonNetworkName || 'Bom Corte Salões';
    const slogan = currentConfig.slogan || 'Rede de Alta Performance & Gestão de Salões';

    printStyledReport(`
      <h2 style="margin-top:0; color:#111827; font-size:18px;">Recibo de Pagamento Semanal de Comissões</h2>
      <div style="background:#FCF9F1; border:1px solid #fed7aa; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:12px;">
        <div style="font-weight:bold; color:#c2410c; margin-bottom:4px;">DADOS DA LIQUIDAÇÃO</div>
        <p style="margin:2px 0;"><strong>Salão / Filial:</strong> ${filial?.name || salonName}</p>
        <p style="margin:2px 0;"><strong>Funcionário:</strong> ${vend?.name} (${vend?.email || 'N/A'})</p>
        <p style="margin:2px 0;"><strong>Período Pago:</strong> ${formatDate(p.periodoInicio)} até ${formatDate(p.dataPagamento)}</p>
        <p style="margin:2px 0;"><strong>Data da Liquidação:</strong> ${new Date(p.dataPagamento).toLocaleDateString('pt-BR')}</p>
        <p style="margin:2px 0;"><strong>Forma de Pagamento:</strong> ${p.formaPagamento}</p>
      </div>
      <table class="report-table">
        <tr>
          <th>Comissão Bruta Acumulada (${p.servicosIds.length} serviços):</th>
          <td class="money"><strong>${formatCurrency(p.totalComissaoBruta)}</strong></td>
        </tr>
        <tr>
          <th>Desconto de Vales / Adiantamentos (${p.valesIds.length} vales):</th>
          <td class="money" style="color: #b91c1c;"><strong>- ${formatCurrency(p.totalValesDescontados)}</strong></td>
        </tr>
        <tr style="font-size: 15px; background-color: #f0fdf4;">
          <th>VALOR LÍQUIDO PAGO:</th>
          <td class="money"><strong style="color: #047857;">${formatCurrency(p.valorLiquidoPago)}</strong></td>
        </tr>
      </table>
      ${p.observacoes ? `<p style="font-size:12px; margin-top:10px;"><strong>Observações:</strong> ${p.observacoes}</p>` : ''}
      <div style="margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
        <div>
          ________________________________________<br/>
          Assinatura do Funcionário (${vend?.name || 'Funcionário'})
        </div>
        <div>
          ________________________________________<br/>
          Responsável Financeiro (${salonName})
        </div>
      </div>
    `, `Recibo_Pagamento_${p.id}`, {
      salonName,
      slogan,
      filialName: filial?.name
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso com Ação Rápida */}
      {paymentSuccessToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#0a2016] to-[#04100b] border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.35)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">{paymentSuccessToast.message}</div>
              <div className="text-emerald-300/80 text-[11px] mt-0.5">
                Os registros foram marcados como pagos e o comprovante já está no histórico.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {paymentSuccessToast.lastPayment && (
              <button
                onClick={() => handlePrintReceipt(paymentSuccessToast.lastPayment!)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
            )}
            <button
              onClick={() => setPaymentSuccessToast(null)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#0C1F31]/90/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Week Cycle Indicator (Monday to Saturday) */}
      <WeekCycleBadge />

      {/* Warning Banner: Pending Unapproved Services */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-[#1C3242] to-[#0B1D2D] border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-amber-200">
                Atenção: Há {pendingCount} atendimento(s) pendente(s) de aprovação
              </div>
              <div className="text-amber-300/70 text-[11px]">
                Apenas atendimentos aprovados pela gerência entram no fechamento de comissões.
              </div>
            </div>
          </div>
          <button
            onClick={handleApproveAllPending}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-end sm:self-center shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>Aprovar Todos ({pendingCount})</span>
          </button>
        </div>
      )}



      <div className="space-y-6">
          
          {/* Filters & Mode Selection */}
          <div className="p-5 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] space-y-4 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C8A45D]/20 pb-3">
              <div className="flex items-center gap-2 text-[#D7C08E] font-bold uppercase">
                <Filter className="w-4 h-4 text-[#C8A45D]" />
                <span>Parâmetros de Apuração</span>
              </div>

              {/* Quick Filter Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterMode === 'ALL_UNPAID'
                      ? 'bg-[#C8A45D] text-black shadow-[0_0_10px_#C8A45D]'
                      : 'bg-black/40 text-[#D7C08E] border border-[#C8A45D]/30 hover:bg-[#C8A45D]/20'
                  }`}
                >
                  ⚡ Todos em Aberto
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('CYCLE_WEEK')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterMode === 'CUSTOM_RANGE' && periodoInicio === calculateWeekCycle(new Date()).startDateStr
                      ? 'bg-[#C8A45D] text-black shadow-[0_0_10px_#C8A45D]'
                      : 'bg-black/40 text-[#D7C08E] border border-[#C8A45D]/30 hover:bg-[#C8A45D]/20'
                  }`}
                  title="Ciclo padrão de Segunda a Sábado desta semana"
                >
                  📅 Ciclo da Semana (Seg a Sáb)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('THIS_MONTH')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    filterMode === 'CUSTOM_RANGE' && periodoInicio === new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
                      ? 'bg-[#C8A45D] text-black font-bold'
                      : 'bg-black/40 text-[#E8D6B5] border border-[#C8A45D]/20 hover:bg-[#0C1F31]/90/5'
                  }`}
                >
                  Este Mês
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {currentUser.role === 'ADMIN' ? (
                <div>
                  <label className="block text-[#D7C08E] mb-1 uppercase">1. Unidade / Filial</label>
                  <select
                    value={selectedFilialId}
                    onChange={(e) => setSelectedFilialId(e.target.value)}
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  >
                    <option value="ALL">Todas as Filiais da Rede</option>
                    {filiais.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[#D7C08E] mb-1 uppercase">Filial de Atuação</label>
                  <div className="bg-[#10283D] border border-[#C8A45D]/20 text-white rounded-xl px-3 py-2">
                    {filiais.find(f => f.id === currentUser.filialId)?.name || 'Minha Filial'}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#D7C08E] mb-1 uppercase">2. Início do Período</label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => {
                    setPeriodoInicio(e.target.value);
                    setFilterMode('CUSTOM_RANGE');
                  }}
                  className={`w-full bg-[#10283D] border text-white rounded-xl px-3 py-2 outline-none ${
                    filterMode === 'CUSTOM_RANGE' ? 'border-[#C8A45D] bg-[#15324A]' : 'border-[#C8A45D]/30 opacity-80'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[#D7C08E] mb-1 uppercase">3. Fim do Período</label>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => {
                    setPeriodoFim(e.target.value);
                    setFilterMode('CUSTOM_RANGE');
                  }}
                  className={`w-full bg-[#10283D] border text-white rounded-xl px-3 py-2 outline-none ${
                    filterMode === 'CUSTOM_RANGE' ? 'border-[#C8A45D] bg-[#15324A]' : 'border-[#C8A45D]/30 opacity-80'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Stylists Settlement List (Table Format) */}
          <div className="relative rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] mt-4">
            <div className={`overflow-x-auto custom-scrollbar ${settlementList.length > 10 ? 'max-h-[500px] overflow-y-auto custom-scrollbar' : ''}`}>
            <table className="w-full text-left text-xs text-white">
              <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${settlementList.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                  <tr>
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Filial</th>
                    <th className="py-3 px-4 text-center">Qtd. Serviços</th>
                    <th className="py-3 px-4 text-center">Qtd. Vales</th>
                    <th className="py-3 px-4">Comissão Bruta</th>
                    <th className="py-3 px-4">Desconto Vales</th>
                    <th className="py-3 px-4">Valor Líquido</th>
                    <th className="py-3 px-4">Forma Pagto.</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8A45D]/10">
                  {settlementList.map((preview) => {
                    const isBlocked = preview.valorLiquido <= 0;

                    return (
                      <tr key={preview.vendedor.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <div className={`w-6 h-6 rounded border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isBlocked ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300' : 'bg-[#C8A45D]/20 border-[#C8A45D]/40 text-white'
                          }`}>
                            {preview.vendedor?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="whitespace-nowrap">{preview.vendedor?.name || 'Usuário Desconhecido'}</span>
                        </td>
                        <td className="py-3 px-4 text-[#E8D6B5]/80 whitespace-nowrap">
                          {preview.filial?.name}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#B49A73]">
                          {preview.approvedServices.length}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#B49A73]">
                          {preview.activeVales.length}
                        </td>
                        <td className="py-3 px-4 font-mono text-white">
                          {formatCurrency(preview.totalComissaoBruta)}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-400">
                          - {formatCurrency(preview.totalVales)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm">
                          <span className={preview.valorLiquido > 0 ? 'text-emerald-400' : preview.valorLiquido < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                            {formatCurrency(preview.valorLiquido)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={preview.formaPagamento}
                            disabled={isBlocked}
                            onChange={(e) => handleUpdatePaymentMethod(preview.vendedor.id, e.target.value as any)}
                            className={`bg-[#10283D] border text-white text-xs font-mono rounded-lg px-2 py-1 outline-none ${
                              isBlocked ? 'border-zinc-800 text-zinc-500 opacity-60 cursor-not-allowed' : 'border-[#C8A45D]/30 focus:border-[#D9B76C]'
                            }`}
                          >
                            <option value="PIX">PIX</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="OUTRO">Outro</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewServices(preview)}
                              className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 border border-[#C8A45D]/20 transition-colors cursor-pointer"
                              title="Ver Composição Detalhada de Serviços e Vales"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {preview.valorLiquido > 0 ? (
                              <button
                                type="button"
                                onClick={() => setConfirmingPayment(preview)}
                                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[11px] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-rose-900/40 text-rose-300/80 font-bold text-[11px] opacity-75 cursor-not-allowed flex items-center gap-1.5"
                                title={preview.valorLiquido < 0 ? 'Saldo Negativo (Bloqueado)' : 'Saldo Zerado'}
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Bloqueado</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {settlementList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 font-mono text-[#B49A73]">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <div className="text-white font-bold text-sm mb-1">Nenhum repasse pendente para os filtros selecionados.</div>
                        <span className="text-xs">Todos os atendimentos aprovados já foram liquidados.</span>
                        {filterMode === 'CUSTOM_RANGE' && (
                          <div className="mt-3">
                            <button
                              onClick={() => handleSetDatePreset('ALL')}
                              className="px-3 py-1.5 rounded-xl bg-[#C8A45D] text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Ver Todos os Serviços em Aberto</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden w-full bg-[#C8A45D] text-black text-center py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-b-2xl flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(255,90,0,0.5)]">
              <span>←</span>
              Deslize a tabela para ver mais
              <span>→</span>
            </div>
          </div>
        </div>

        {/* HISTORICO DE PAGAMENTOS */}
        <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
          <div className="p-4 border-b border-[#C8A45D]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-yellow-400 animate-pulse font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              PAGAMENTOS EFETUADOS
            </h3>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <button
                onClick={forceRefreshPg}
                disabled={isRefreshingPg}
                className="px-2.5 py-1.5 rounded-xl bg-[#10283D] border border-[#C8A45D]/40 text-[#D7C08E] hover:text-white hover:border-[#C8A45D]/70 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                title="Atualizar dados do Supabase agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPg ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              {currentUser.role === 'ADMIN' && (
                <select
                  value={selectedHistoryFilialId}
                  onChange={(e) => setSelectedHistoryFilialId(e.target.value)}
                  className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs font-mono rounded-xl px-3 py-1.5 outline-none focus:border-[#D9B76C]"
                >
                  <option value="ALL">Todas as Filiais (Histórico)</option>
                  {filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
              <span className="text-xs text-[#B49A73] font-mono whitespace-nowrap">
                {historicoFiltrado.length} registros
              </span>
            </div>
          </div>

          <div className={`overflow-x-auto custom-scrollbar ${historicoFiltrado.length > 10 ? 'max-h-[440px] overflow-y-auto custom-scrollbar' : ''}`}>
            <table className="w-full text-left text-xs text-white">
              <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${historicoFiltrado.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                <tr>
                  <th className="py-3 px-4">Data Liquidação</th>
                  <th className="py-3 px-4">Funcionário</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4">Comissão Bruta</th>
                  <th className="py-3 px-4">Vales Descontados</th>
                  <th className="py-3 px-4">Valor Líquido Pago</th>
                  <th className="py-3 px-4">Aprovado por</th>
                  <th className="py-3 px-4">Quem Pagou</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8A45D]/10">
                {historicoFiltrado.map((p) => {
                  const vend = users.find(u => u.id === p.vendedorId);
                  const filial = filiais.find(f => f.id === p.filialId);

                  return (
                    <tr key={p.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#B49A73]">
                        {p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {vend?.name || 'Funcionário'}
                      </td>
                      <td className="py-3 px-4 text-[#E8D6B5]/80">
                        {filial?.name}
                      </td>
                      <td className="py-3 px-4">
                        {p.status === 'PENDENTE' || p.status === 'PROCESSANDO' ? (
                          <span className={`${p.status === 'PROCESSANDO' ? 'badge-processando-alerta' : 'badge-pendente-alerta'} inline-flex whitespace-nowrap`}>
                            {p.status === 'PROCESSANDO' ? '⏳ Processando Pagamento' : '⚠ Pagamento Pendente'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-mono font-black uppercase tracking-wider border bg-emerald-950/50 border-emerald-500/60 text-emerald-300">
                            ✓ PAGO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#B49A73]">
                        {formatDate(p.periodoInicio)} - {formatDate(p.dataPagamento)}
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        {formatCurrency(p.totalComissaoBruta)}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-400">
                        - {formatCurrency(p.totalValesDescontados)}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold text-sm">
                        {formatCurrency(p.valorLiquidoPago)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E8D6B5]/80 whitespace-nowrap">
                        {getPaymentApprover(p)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E8D6B5]/80 whitespace-nowrap">
                        {getPaymentPayer(p)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E8D6B5]/80">
                        {p.formaPagamento === 'RECUPERADO' ? 'Não informada' : p.formaPagamento}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(p)}
                          className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors cursor-pointer"
                          title="Imprimir Comprovante"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {historicoFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-[#B49A73] font-mono">
                      {currentUser.role === 'GERENTE'
                        ? 'Nenhum pagamento registrado para a sua filial até o momento.'
                        : selectedHistoryFilialId === 'ALL'
                          ? 'Nenhum fechamento registrado até o momento em nenhuma filial.'
                          : 'Nenhum fechamento registrado para a filial selecionada.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* MODAL IN-APP CONFIRMATION INDIVIDUAL PAYMENT */}
      {confirmingPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border-2 border-[#C8A45D] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <CreditCard className="w-4 h-4 text-[#C8A45D]" />
                <span>Confirmar Liquidação de Pagamento</span>
              </div>
              <button 
                type="button"
                onClick={() => setConfirmingPayment(null)} 
                className="text-[#D7C08E] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-xl bg-black/50 border border-[#C8A45D]/20">
                <div className="text-[10px] text-[#B49A73] uppercase">Funcionário</div>
                <div className="font-bold text-white text-sm mt-0.5">{confirmingPayment.vendedor.name}</div>
                <div className="text-[10px] text-[#D7C08E]">{confirmingPayment.filial?.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/15">
                  <div className="text-[9px] text-[#B49A73]">Comissão ({confirmingPayment.approvedServices.length} serviços)</div>
                  <div className="font-bold text-white text-xs">{formatCurrency(confirmingPayment.totalComissaoBruta)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/15 text-rose-400">
                  <div className="text-[9px]">Vales ({confirmingPayment.activeVales.length} vales)</div>
                  <div className="font-bold text-xs">- {formatCurrency(confirmingPayment.totalVales)}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">VALOR LÍQUIDO A TRANSFERIR:</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {formatCurrency(confirmingPayment.valorLiquido)}
                </div>
                <div className="text-[10px] text-emerald-200/70 mt-1">
                  Via {confirmingPayment.formaPagamento}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C8A45D]/20">
              <button
                type="button"
                onClick={() => setConfirmingPayment(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executePayIndividual(confirmingPayment)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Liquidar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN-APP CONFIRMATION PAY ALL */}
      {confirmingPayAll && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border-2 border-[#C8A45D] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Liquidação Geral em Lote</span>
              </div>
              <button 
                type="button"
                onClick={() => setConfirmingPayAll(false)} 
                className="text-[#D7C08E] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-zinc-300">
                Você está prestes a liquidar o fechamento de <strong className="text-white">{payableSettlements.length} funcionário(s)</strong> aptos com saldo positivo.
              </p>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">TOTAL GERAL A LIQUIDAR:</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {formatCurrency(grandTotalLiquido)}
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {payableSettlements.map(p => (
                  <div key={p.vendedor.id} className="p-2 rounded-lg bg-black/40 border border-[#C8A45D]/15 flex items-center justify-between text-[11px]">
                    <span className="text-white font-bold">{p.vendedor.name}</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(p.valorLiquido)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C8A45D]/20">
              <button
                type="button"
                onClick={() => setConfirmingPayAll(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executePayAll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Confirmar Todos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVIEW SERVICES BEFORE SETTLING */}
      {selectedPreviewServices && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8A45D]" />
                Composição do Pagamento: {selectedPreviewServices.vendedor.name}
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedPreviewServices(null)} 
                className="text-[#D7C08E] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="font-mono text-[#D7C08E] uppercase mb-2">Serviços Aprovados a Liquidar ({selectedPreviewServices.approvedServices.length}):</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {selectedPreviewServices.approvedServices.map(s => (
                    <div key={s.id} className="p-2 rounded-lg bg-black/40 border border-[#C8A45D]/15 flex items-center justify-between font-mono">
                      <div>
                        <div className="text-white font-bold">Atendimento</div>
                        <div className="text-[10px] text-[#B49A73]">{new Date(s.dataHora).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#F1DEB5] font-bold">{formatCurrency(s.valorComissao)}</div>
                        <div className="text-[9px] text-[#B49A73]">Cobrado: {formatCurrency(s.valorCobrado)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPreviewServices.activeVales.length > 0 && (
                <div>
                  <div className="font-mono text-rose-400 uppercase mb-2">Vales a Descontar ({selectedPreviewServices.activeVales.length}):</div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {selectedPreviewServices.activeVales.map(v => (
                      <div key={v.id} className="p-2 rounded-lg bg-rose-950/20 border border-rose-600/30 flex items-center justify-between font-mono">
                        <div>
                          <div className="text-white">{v.motivo}</div>
                          <div className="text-[10px] text-[#B49A73]">{new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="text-rose-400 font-bold">- {formatCurrency(v.valor)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 flex justify-between items-center font-mono">
              <div>
                <span className="text-[#B49A73]">Líquido a Pagar: </span>
                <span className="text-base font-black text-emerald-400">{formatCurrency(selectedPreviewServices.valorLiquido)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewServices(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
