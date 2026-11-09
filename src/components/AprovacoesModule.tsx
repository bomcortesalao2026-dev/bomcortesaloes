import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  AlertTriangle, 
  Eye, 
  Building2, 
  User as UserIcon, 
  Scissors, 
  DollarSign, 
  CheckCheck,
  X,
  Sparkles,
  CreditCard,
  Plus,
  Hash,
  Edit3,
  Lock,
  Bell,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistroServico, Vale, User, Filial, Servico } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';
import { getDefaultApprovalStatus, getDefaultValeStatus, sortByServiceStatusPriority, sortByValeStatusPriority } from '../utils/approvalFilters';
import { EditServiceModal } from './EditServiceModal';
import { PedidoNotificacaoModal } from './PedidoNotificacaoModal';

interface AprovacoesModuleProps {
  currentUser: User;
}

export const AprovacoesModule: React.FC<AprovacoesModuleProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'SERVICOS' | 'VALES'>('SERVICOS');

  // Services state
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Filters (Services)
  const [selectedStatus, setSelectedStatus] = useState<string>(getDefaultApprovalStatus(currentUser.role));
  const [selectedFilial, setSelectedFilial] = useState<string>(
    currentUser.role === 'ADMIN' ? 'ALL' : (currentUser.filialId || 'ALL')
  );
  const [selectedVendedor, setSelectedVendedor] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [onlyWithNotification, setOnlyWithNotification] = useState<boolean>(false);

  // Notification Modal State
  const [notificacaoModalRecord, setNotificacaoModalRecord] = useState<RegistroServico | null>(null);

  // Filters (Vales)
  const [valesStatusFilter, setValesStatusFilter] = useState<string>(getDefaultValeStatus(currentUser.role));
  const [valesSearchTerm, setValesSearchTerm] = useState<string>('');

  // Modals (Services)
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<RegistroServico | null>(null);
  const [editingServiceRecord, setEditingServiceRecord] = useState<RegistroServico | null>(null);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState<boolean>(false);
  const [rejectionModalRecord, setRejectionModalRecord] = useState<RegistroServico | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string>('');

  // Modals (Vales)
  const [rejectionModalVale, setRejectionModalVale] = useState<Vale | null>(null);
  const [valeRejectionReason, setValeRejectionReason] = useState<string>('');
  const [approvalModalVale, setApprovalModalVale] = useState<Vale | null>(null);
  const [approvalValeAmount, setApprovalValeAmount] = useState<number>(0);
  const [isAddValeModalOpen, setIsAddValeModalOpen] = useState<boolean>(false);
  const [manualVendedorId, setManualVendedorId] = useState<string>('');
  const [manualValor, setManualValor] = useState<string>('');
  const [manualMotivo, setManualMotivo] = useState<string>('');

  // Modal (Lançar Atendimento em nome do Funcionário)
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
  const [manualServiceFilialId, setManualServiceFilialId] = useState<string>('');
  const [manualServiceVendedorId, setManualServiceVendedorId] = useState<string>('');
  const [manualServiceServicoId, setManualServiceServicoId] = useState<string>('');
  const [manualServiceQuantidade, setManualServiceQuantidade] = useState<string>('1');
  const [manualServiceValorUnitario, setManualServiceValorUnitario] = useState<string>('');
  const [manualServiceError, setManualServiceError] = useState<string>('');

  const refreshData = () => {
    setRegistros(StorageService.getRegistrosServicos());
    setVales(StorageService.getVales());
    setFiliais(StorageService.getFiliais());
    setUsers(StorageService.getUsers());
    setServicos(StorageService.getServicos());
  };

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  const forceRefreshFromSupabase = async (force = true) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await StorageService.refreshForScreen('APPROVALS', force);
      refreshData();
      setLastRefreshTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    refreshData();
    forceRefreshFromSupabase();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshFromSupabase(false);
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => document.removeEventListener('visibilitychange', refreshOnReturn);
  }, []);

  // --- SERVICE ACTIONS ---
  const handleApproveService = async (recordId: string) => {
    if (processingId) return;
    setProcessingId(recordId);
    
    const updated = StorageService.approveRegistro(recordId, currentUser);
    if (!updated) {
      setProcessingId(null);
      return;
    }
    try {
      confetti({
        particleCount: 40,
        spread: 40,
        colors: ['#10b981', '#ffffff', '#C8A45D']
      });
    } catch {}
    refreshData();
    setProcessingId(null);
  };

  const handleBulkApproveServices = () => {
    const pendingToApprove = filteredServices.filter(r => r.status === 'PENDENTE');
    if (pendingToApprove.length === 0) return;

    pendingToApprove.forEach(r => {
      StorageService.approveRegistro(r.id, currentUser);
    });
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        colors: ['#10b981', '#D9B76C', '#ffffff']
      });
    } catch {}
    refreshData();
  };

  const handleConfirmRejectService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalRecord) return;
    if (!rejectionReason.trim()) {
      setRejectionError('É obrigatório informar a justificativa da reprovação.');
      return;
    }

    StorageService.rejectRegistro(rejectionModalRecord.id, rejectionReason.trim(), rejectionReason.trim(), currentUser);
    setRejectionModalRecord(null);
    setRejectionReason('');
    refreshData();
  };

  // --- VALES ACTIONS ---
  const handleApproveVale = (valeId: string) => {
    const updated = StorageService.approveVale(valeId, currentUser);
    if (!updated) return;
    try {
      confetti({
        particleCount: 40,
        spread: 40,
        colors: ['#10b981', '#ffffff', '#C8A45D']
      });
    } catch {}
    refreshData();
  };

  const handleConfirmRejectVale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalVale) return;
    if (!valeRejectionReason.trim()) return;

    StorageService.rejectVale(rejectionModalVale.id, currentUser, valeRejectionReason.trim(), valeRejectionReason.trim());
    setRejectionModalVale(null);
    setValeRejectionReason('');
    refreshData();
  };

  const handleCreateManualVale = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualValor) || 0;
    if (!manualVendedorId) {
      alert('Por favor, selecione um funcionário.');
      return;
    }
    if (val <= 0) {
      alert('Por favor, informe um valor maior que zero para o vale.');
      return;
    }
    if (!manualMotivo.trim()) {
      alert('Por favor, informe o motivo ou descrição do vale.');
      return;
    }

    const targetUser = users.find(u => u.id === manualVendedorId);
    const filialId = targetUser?.filialId || currentUser.filialId || filiais[0]?.id || 'filial-1';

    const agoraISO = new Date().toISOString();
    const motivoFinal = `[Lançamento Gerencial] ${manualMotivo.trim()}`;
    const novoVale: Vale = {
      id: 'vale-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      vendedorId: manualVendedorId,
      filialId,
      valor: val,
      valorSolicitado: val,
      motivo: motivoFinal,
      dataSolicitacao: agoraISO,
      data: agoraISO.slice(0, 10),
      status: 'PENDENTE',
      createdAt: agoraISO,
    };

    const salvo = StorageService.addVale(novoVale);

    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Solicitação de Vale (Lançamento Gerencial)',
      registroTipo: 'VALE',
      registroId: salvo.id,
      registroDescricao: `Vale para ${targetUser?.name || manualVendedorId} - R$ ${salvo.valor.toFixed(2)}`,
      detalhes: motivoFinal,
    });

    setIsAddValeModalOpen(false);
    setManualValor('');
    setManualMotivo('');
    refreshData();
  };

  // --- LANÇAR ATENDIMENTO EM NOME DO FUNCIONÁRIO ---
  // Admin: enxerga todas as filiais e pode filtrar; Gerente: só a própria filial.
  const manualServiceFuncionarios = users.filter(u =>
    u.role === 'VENDEDOR' &&
    (currentUser.role === 'ADMIN'
      ? (manualServiceFilialId === 'ALL' || !manualServiceFilialId || u.filialId === manualServiceFilialId)
      : u.filialId === currentUser.filialId)
  );
  const manualServiceServico = servicos.find(s => s.id === manualServiceServicoId);
  const manualServiceCommissionPercent = manualServiceServico ? manualServiceServico.commissionPercent : 0;
  const manualServiceParsedPrice = parseFloat(manualServiceValorUnitario) || 0;
  const manualServiceSafeQty = Math.max(1, parseInt(manualServiceQuantidade) || 1);
  const manualServiceTotal = Number((manualServiceParsedPrice * manualServiceSafeQty).toFixed(2));
  const manualServiceCommission = Number(((manualServiceTotal * manualServiceCommissionPercent) / 100).toFixed(2));
  const manualServiceSalao = Number((manualServiceTotal - manualServiceCommission).toFixed(2));

  const openAddServiceModal = () => {
    setManualServiceError('');
    const initialFilialId = currentUser.role === 'GERENTE' ? (currentUser.filialId || '') : 'ALL';
    setManualServiceFilialId(initialFilialId);
    const scopeFilialId = currentUser.role === 'GERENTE' ? currentUser.filialId : undefined;
    const availableVends = users.filter(u => u.role === 'VENDEDOR' && (!scopeFilialId || u.filialId === scopeFilialId));
    const firstVend = availableVends[0]?.id || '';
    setManualServiceVendedorId(firstVend);
    
    const func = users.find(u => u.id === firstVend);
    const activeServicos = servicos.filter(s => s.status === 'ATIVO' && (!func?.funcaoId || !s.funcaoId || s.funcaoId === func.funcaoId));
    setManualServiceServicoId(activeServicos[0]?.id || '');
    setManualServiceQuantidade('1');
    setManualServiceValorUnitario('');
    setIsAddServiceModalOpen(true);
  };

  const handleCreateManualService = (e: React.FormEvent) => {
    e.preventDefault();
    setManualServiceError('');

    const targetUser = users.find(u => u.id === manualServiceVendedorId);
    if (!targetUser) {
      setManualServiceError('Selecione o funcionário que realizou o atendimento.');
      return;
    }
    if (!manualServiceServicoId) {
      setManualServiceError('Selecione o serviço realizado.');
      return;
    }
    if (manualServiceParsedPrice <= 0) {
      setManualServiceError('Informe o valor unitário do serviço.');
      return;
    }

    const filialId = targetUser.filialId || currentUser.filialId || filiais[0]?.id || 'filial-1';
    const agoraISO = new Date().toISOString();

    const novoRegistro: RegistroServico = {
      id: 'reg-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      filialId,
      vendedorId: targetUser.id,
      servicoId: manualServiceServicoId,
      quantidade: manualServiceSafeQty,
      valorUnitario: manualServiceParsedPrice,
      valorCobrado: manualServiceTotal,
      commissionPercent: manualServiceCommissionPercent,
      valorComissao: manualServiceCommission,
      valorSalao: manualServiceSalao,
      dataHora: agoraISO,
      status: 'PENDENTE',
      observacoes: `[Lançado pela ${currentUser.role === 'ADMIN' ? 'Administração' : 'Gerência'} em nome do funcionário por ${currentUser.name}]`,
      createdAt: agoraISO,
    };

    const newRecord = StorageService.addRegistro(novoRegistro);

    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Novo Atendimento (Lançamento em nome do Funcionário)',
      registroTipo: 'REGISTRO_SERVICO',
      registroId: newRecord.id,
      registroDescricao: `${manualServiceServico?.name || 'Serviço'} para ${targetUser.name} - R$ ${newRecord.valorCobrado.toFixed(2)}`,
      detalhes: `Qtd: ${manualServiceSafeQty} | Vl Unit: R$ ${manualServiceParsedPrice.toFixed(2)} | Comissão ${manualServiceCommissionPercent}%: R$ ${manualServiceCommission.toFixed(2)}`,
    });

    setIsAddServiceModalOpen(false);
    refreshData();
  };

  // Check if order has any active notification or alert
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
      (r.notificacao && typeof r.notificacao === 'string' && r.notificacao.trim()) ||
      (r.motivoReprovacao && typeof r.motivoReprovacao === 'string' && r.motivoReprovacao.trim()) ||
      (r.justificativaReprovacao && typeof r.justificativaReprovacao === 'string' && r.justificativaReprovacao.trim()) ||
      hasRealEdits
    );
  };

  // Filtered Services
  const filteredServices = registros.filter(r => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && r.filialId !== currentUser.filialId) return false;
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (selectedFilial !== 'ALL' && r.filialId !== selectedFilial) return false;
    if (selectedVendedor !== 'ALL' && r.vendedorId !== selectedVendedor) return false;
    if (onlyWithNotification && !hasOrderNotification(r)) return false;
    if (searchTerm) {
      const vendName = users.find(u => u.id === r.vendedorId)?.name || '';
      const servName = servicos.find(s => s.id === r.servicoId)?.name || '';
      const filialName = filiais.find(f => f.id === r.filialId)?.name || '';
      const notif = r.notificacao || '';
      const q = searchTerm.toLowerCase();
      const matchVend = vendName.toLowerCase().includes(q);
      const matchServ = servName.toLowerCase().includes(q);
      const matchFilial = filialName.toLowerCase().includes(q);
      const matchNotif = notif.toLowerCase().includes(q);
      if (!matchVend && !matchServ && !matchFilial && !matchNotif) return false;
    }
    return true;
  });
  // PENDENTES SEMPRE NO TOPO — ordenação segura (sem operador |>)
  const filteredServicesSorted: RegistroServico[] = sortByServiceStatusPriority(filteredServices);

  const totalNotificacoesServicesCount = registros.filter(r => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && r.filialId !== currentUser.filialId) return false;
    if (selectedFilial !== 'ALL' && r.filialId !== selectedFilial) return false;
    return hasOrderNotification(r);
  }).length;

  // Filtered Vales
  const filteredVales = vales.filter(v => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && v.filialId !== currentUser.filialId) return false;
    if (valesStatusFilter !== 'ALL' && v.status !== valesStatusFilter) return false;
    if (selectedFilial !== 'ALL' && v.filialId !== selectedFilial) return false;
    if (valesSearchTerm) {
      const vendName = users.find(u => u.id === v.vendedorId)?.name || '';
      const matchName = vendName.toLowerCase().includes(valesSearchTerm.toLowerCase());
      const matchMotivo = v.motivo.toLowerCase().includes(valesSearchTerm.toLowerCase());
      if (!matchName && !matchMotivo) return false;
    }
    return true;
  });
  // PENDENTES SEMPRE NO TOPO — ordenação segura (sem operador |>)
  const filteredValesSorted: Vale[] = sortByValeStatusPriority(filteredVales);

  const pendingServicesCount = registros.filter(r => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && r.filialId !== currentUser.filialId) return false;
    return r.status === 'PENDENTE';
  }).length;

  const pendingValesCount = vales.filter(v => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && v.filialId !== currentUser.filialId) return false;
    return v.status === 'PENDENTE';
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#C8A45D]" />
            Central de Aprovações da Gerência
          </h2>
          <p className="text-xs text-[#B49A73]">
            Validação de serviços realizados pelos profissionais e aprovação de adiantamentos/vales.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-2 bg-[#10283D] p-1 rounded-xl border border-[#C8A45D]/30">
          <button
            onClick={() => setActiveTab('SERVICOS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SERVICOS'
                ? 'bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white shadow-[0_0_15px_rgba(255,90,0,0.4)]'
                : 'text-[#E8D6B5]/80 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços</span>
            {pendingServicesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/60 text-[#F1DEB5] text-[10px]">
                {pendingServicesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('VALES')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'VALES'
                ? 'bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white shadow-[0_0_15px_rgba(255,90,0,0.4)]'
                : 'text-[#E8D6B5]/80 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Vales & Adiantamentos</span>
            {pendingValesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/60 text-[#F1DEB5] text-[10px]">
                {pendingValesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: SERVICOS */}
      {activeTab === 'SERVICOS' && (
        <div className="space-y-4">
          
          {/* Quick Actions & Filters */}
          <div className="p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 space-y-3">
            {/* Status chips (preferência do usuário: chips coloridos ao invés de dropdown) */}
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-2 uppercase tracking-wider">Status do Atendimento</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'PENDENTE', label: 'Pendentes', count: registros.filter(r => (currentUser.role === 'ADMIN' || !currentUser.filialId || r.filialId === currentUser.filialId) && r.status === 'PENDENTE').length, classes: 'bg-amber-900/50 border-amber-500/60 text-amber-200 hover:bg-amber-800/60' },
                  { key: 'APROVADO', label: 'Aprovados', count: registros.filter(r => (currentUser.role === 'ADMIN' || !currentUser.filialId || r.filialId === currentUser.filialId) && r.status === 'APROVADO').length, classes: 'bg-emerald-900/40 border-emerald-500/60 text-emerald-200 hover:bg-emerald-800/50' },
                  { key: 'REPROVADO', label: 'Reprovados', count: registros.filter(r => (currentUser.role === 'ADMIN' || !currentUser.filialId || r.filialId === currentUser.filialId) && r.status === 'REPROVADO').length, classes: 'bg-rose-900/40 border-rose-500/60 text-rose-200 hover:bg-rose-800/50' },
                  { key: 'PAGO', label: 'Pagos', count: registros.filter(r => (currentUser.role === 'ADMIN' || !currentUser.filialId || r.filialId === currentUser.filialId) && r.status === 'PAGO').length, classes: 'bg-cyan-900/40 border-cyan-500/60 text-cyan-200 hover:bg-cyan-800/50' },
                  { key: 'ALL', label: 'Todos', count: registros.filter(r => (currentUser.role === 'ADMIN' || !currentUser.filialId || r.filialId === currentUser.filialId)).length, classes: 'bg-[#10283D] border-[#C8A45D]/40 text-[#E8D6B5] hover:bg-[#16344d]' },
                ].map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setSelectedStatus(chip.key)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      selectedStatus === chip.key
                        ? chip.classes + ' ring-2 ring-[#C8A45D]/60 shadow-[0_0_18px_rgba(255,90,0,0.35)] ' + (chip.key === 'PENDENTE' ? 'chip-status-pendente-ativo ' : '')
                        : 'bg-black/30 border-black/30 text-[#9a8b73] hover:border-[#C8A45D]/40 hover:text-[#E8D6B5]'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono ${
                      selectedStatus === chip.key ? 'bg-black/45 text-white' : 'bg-black/40 text-[#B49A73]'
                    }`}>
                      {chip.count}
                    </span>
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {lastRefreshTime && (
                    <span className="text-[10px] font-mono text-[#B49A73]">
                      Atualizado às {lastRefreshTime}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={forceRefreshFromSupabase}
                    disabled={isRefreshing}
                    className="px-2.5 py-1.5 rounded-xl bg-[#10283D] border border-[#C8A45D]/40 text-[#D7C08E] hover:text-white hover:border-[#C8A45D]/70 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                    title="Atualizar do Supabase agora"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filial, Vendedor, Busca — row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Filial */}
            {currentUser.role === 'ADMIN' ? (
              <div>
                <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Filial</label>
                <select
                  value={selectedFilial}
                  onChange={(e) => setSelectedFilial(e.target.value)}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  <option value="ALL">Todas as Filiais</option>
                  {filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Filial</label>
                <div className="bg-[#10283D] border border-[#C8A45D]/20 text-white text-xs rounded-xl px-3 py-2 font-mono">
                  {filiais.find(f => f.id === currentUser.filialId)?.name || 'Minha Filial'}
                </div>
              </div>
            )}

            {/* Vendedor */}
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Funcionário</label>
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              >
                <option value="ALL">Todos os Funcionários</option>
                {users.filter(u => u.role === 'VENDEDOR' && (currentUser.role === 'ADMIN' || u.filialId === currentUser.filialId)).map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Busca Rápida</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  type="text"
                  placeholder="Profissional, serviço, filial ou aviso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
                />
              </div>
            </div>
            </div>
          </div>

          {/* Quick Filter: Notificações & Pending Alert */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={openAddServiceModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white text-xs font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lançar Atendimento p/ Funcionário</span>
            </button>
            <button
              onClick={() => setOnlyWithNotification(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyWithNotification
                  ? 'bg-gradient-to-r from-amber-500 to-[#C8A45D] text-white border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                  : totalNotificacoesServicesCount > 0
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-[#10283D] border-[#C8A45D]/30 text-[#E8D6B5]/80 hover:text-white'
              }`}
              title="Filtrar pedidos com notificações ativas"
            >
              <Bell className={`w-3.5 h-3.5 ${totalNotificacoesServicesCount > 0 ? 'animate-bounce text-amber-300' : ''}`} />
              <span>Filtrar Com Notificação</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                onlyWithNotification ? 'bg-black/50 text-white' : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
              }`}>
                {totalNotificacoesServicesCount}
              </span>
            </button>
          </div>

          {/* Bulk Approve removido a pedido do usuário */}

          {/* Services Table */}
          <div className="relative rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
            <div className={`overflow-x-auto custom-scrollbar pb-2 ${filteredServicesSorted.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
              <table className="min-w-[1300px] w-full text-left text-[10px] text-white table-fixed whitespace-nowrap">
                <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${filteredServicesSorted.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                  <tr>
                    <th className="py-3 px-2 text-left">Data/Hora</th>
                    <th className="py-3 px-2 text-left">Funcionário</th>
                    <th className="py-3 px-2 text-left">Filial</th>
                    <th className="py-3 px-2 text-left">Serviço</th>
                    <th className="py-3 px-2 text-left">Qtd.</th>
                    <th className="py-3 px-2 text-left">Total</th>
                    <th className="py-3 px-2 text-left">Comissão %</th>
                    <th className="py-3 px-2 text-left">Comissão</th>
                    <th className="py-3 px-2 text-left">Status</th>
                    <th className="py-3 px-2 text-center">Aviso</th>
                    <th className="w-[260px] py-3 px-2 text-right whitespace-nowrap">Decisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8A45D]/10">
                  {filteredServicesSorted.map((r) => {
                    const vend = users.find(u => u.id === r.vendedorId);
                    const filial = filiais.find(f => f.id === r.filialId);
                    const serv = servicos.find(s => s.id === r.servicoId);
                    const qty = r.quantidade || 1;
                    const hasNotif = hasOrderNotification(r);

                    return (
                      <tr key={r.id} className="hover:bg-[#C8A45D]/5 transition-colors align-middle">
                        <td className="py-3 px-2 font-mono text-[#B49A73] whitespace-nowrap">
                          {new Date(r.dataHora).toLocaleDateString('pt-BR')} {new Date(r.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 font-bold text-white whitespace-nowrap">
                          {vend?.name || 'Funcionário'}
                        </td>
                        <td className="py-3 px-2 text-[#E8D6B5]/80 whitespace-nowrap">
                          {filial?.name}
                        </td>
                        <td className="py-3 px-2 text-white">
                          {serv?.name || 'Serviço'}
                        </td>
                        <td className="py-3 px-2 font-mono font-bold text-[#F1DEB5] whitespace-nowrap">
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
                        <td className="py-3 px-2">
                          {r.status === 'PENDENTE' ? (
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.6)]" title="Pendente" aria-label="Pendente" />
                          ) : (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                              r.status === 'APROVADO'
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                                : r.status === 'PAGO'
                                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                            }`}>
                              {r.status === 'APROVADO' ? '✓ APROVADO' : r.status === 'PAGO' ? '💲 PAGO' : '✗ REPROVADO'}
                            </span>
                          )}
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
                              <span className="max-w-[80px] truncate text-[9px] font-mono">
                                {r.notificacao ? 'Aviso' : r.motivoReprovacao ? 'Reprovado' : 'Alterado'}
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

                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                            {(() => {
                              const isBlocked = r.status === 'PAGO' || r.status === 'REPROVADO';
                              return (
                                <button
                                  onClick={() => {
                                    if (!isBlocked) {
                                      setEditingServiceRecord(r);
                                      setIsEditServiceModalOpen(true);
                                    }
                                  }}
                                  disabled={isBlocked}
                                  className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 font-bold text-[10px] ${
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
                                  <span className="hidden xl:inline">Alterar</span>
                                </button>
                              );
                            })()}
                            <button
                              onClick={() => setViewingRecord(r)}
                              className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors cursor-pointer"
                              title="Visualizar Detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {r.status === 'PENDENTE' && (
                              <>
                                <button
                                  onClick={() => handleApproveService(r.id)}
                                  disabled={processingId !== null}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                                    processingId !== null
                                      ? 'bg-[#0C1C2B]/70 text-[#9a7b6c] border border-[#C8A45D]/15 cursor-not-allowed opacity-50'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer'
                                  }`}
                                  title="Aprovar Lançamento"
                                >
                                  {processingId === r.id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Aprovar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (processingId !== null) return;
                                    setRejectionModalRecord(r);
                                    setRejectionReason('');
                                    setRejectionError('');
                                  }}
                                  disabled={processingId !== null}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                                    processingId !== null
                                      ? 'bg-[#0C1C2B]/70 text-[#9a7b6c] border border-[#C8A45D]/15 cursor-not-allowed opacity-50'
                                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] cursor-pointer'
                                  }`}
                                  title="Reprovar Lançamento"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reprovar</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredServicesSorted.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-[#B49A73] font-mono">
                        Nenhum atendimento encontrado para os critérios selecionados.
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
      )}

      {/* TAB 2: VALES */}
      {activeTab === 'VALES' && (
        <div className="space-y-4">
          
          {/* Controls & Filter */}
          <div className="p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 space-y-3">
            {/* Chips de status para vales */}
            <div>
              <label className="block text-[11px] font-mono text-[#D7C08E] mb-2 uppercase tracking-wider">Status do Vale</label>
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { key: 'PENDENTE', label: 'Pendentes', count: vales.filter(v => (currentUser.role === 'ADMIN' || !currentUser.filialId || v.filialId === currentUser.filialId) && v.status === 'PENDENTE').length, classes: 'bg-amber-900/50 border-amber-500/60 text-amber-200 hover:bg-amber-800/60' },
                  { key: 'APROVADO', label: 'Aprovados', count: vales.filter(v => (currentUser.role === 'ADMIN' || !currentUser.filialId || v.filialId === currentUser.filialId) && v.status === 'APROVADO').length, classes: 'bg-emerald-900/40 border-emerald-500/60 text-emerald-200 hover:bg-emerald-800/50' },
                  { key: 'DESCONTADO', label: 'Descontados', count: vales.filter(v => (currentUser.role === 'ADMIN' || !currentUser.filialId || v.filialId === currentUser.filialId) && v.status === 'DESCONTADO').length, classes: 'bg-cyan-900/40 border-cyan-500/60 text-cyan-200 hover:bg-cyan-800/50' },
                  { key: 'REPROVADO', label: 'Reprovados', count: vales.filter(v => (currentUser.role === 'ADMIN' || !currentUser.filialId || v.filialId === currentUser.filialId) && v.status === 'REPROVADO').length, classes: 'bg-rose-900/40 border-rose-500/60 text-rose-200 hover:bg-rose-800/50' },
                  { key: 'ALL', label: 'Todos', count: vales.filter(v => (currentUser.role === 'ADMIN' || !currentUser.filialId || v.filialId === currentUser.filialId)).length, classes: 'bg-[#10283D] border-[#C8A45D]/40 text-[#E8D6B5] hover:bg-[#16344d]' },
                ].map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setValesStatusFilter(chip.key)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      valesStatusFilter === chip.key
                        ? chip.classes + ' ring-2 ring-[#C8A45D]/60 shadow-[0_0_18px_rgba(255,90,0,0.35)] ' + (chip.key === 'PENDENTE' ? 'chip-status-pendente-ativo ' : '')
                        : 'bg-black/30 border-black/30 text-[#9a8b73] hover:border-[#C8A45D]/40 hover:text-[#E8D6B5]'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono ${
                      valesStatusFilter === chip.key ? 'bg-black/45 text-white' : 'bg-black/40 text-[#B49A73]'
                    }`}>
                      {chip.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Busca + Botão */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Busca por Funcionário ou Motivo</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                  <input
                    type="text"
                    placeholder="Funcionário ou finalidade..."
                    value={valesSearchTerm}
                    onChange={(e) => setValesSearchTerm(e.target.value)}
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    const availableVends = users.filter(u => u.role === 'VENDEDOR' && (currentUser.role === 'ADMIN' || u.filialId === currentUser.filialId));
                    if (availableVends.length > 0) {
                      setManualVendedorId(availableVends[0].id);
                    }
                    setIsAddValeModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lançar Vale Manual</span>
                </button>
              </div>
            </div>
          </div>

          {/* Vales Table */}
          <div className="relative rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
            <div className={`hidden md:block overflow-x-auto custom-scrollbar pb-2 ${filteredValesSorted.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
              <table className="min-w-[900px] w-full text-left text-[10px] text-white table-fixed">
                <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${filteredValesSorted.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
                  <tr>
                    <th className="py-3 px-2">Data</th>
                    <th className="py-3 px-2">Funcionário</th>
                    <th className="py-3 px-2">Filial</th>
                    <th className="py-3 px-2">Valor</th>
                    <th className="py-3 px-2">Motivo</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Decisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8A45D]/10">
                  {filteredValesSorted.map((v) => {
                    const vend = users.find(u => u.id === v.vendedorId);
                    const filial = filiais.find(f => f.id === v.filialId);

                    return (
                      <tr key={v.id} className="hover:bg-[#C8A45D]/5 transition-colors align-top">
                        <td className="py-3 px-2 font-mono text-[#B49A73] whitespace-nowrap">
                          {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')} {new Date(v.dataSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 font-bold text-white whitespace-nowrap">
                          {vend?.name || 'Funcionário'}
                        </td>
                        <td className="py-3 px-2 text-[#E8D6B5]/80 whitespace-nowrap">
                          {filial?.name}
                        </td>
                        <td className="py-3 px-2 font-mono text-white font-bold text-sm whitespace-nowrap">
                          {formatCurrency(v.valor)}
                        </td>
                        <td className="py-3 px-2 text-[#E8D6B5]/80 max-w-xs truncate">
                          {v.motivo}
                        </td>
                        <td className="py-3 px-2">
                          {v.status === 'PENDENTE' ? (
                            <span className="badge-pendente-alerta">
                              ⚠ Pendente
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                              v.status === 'APROVADO'
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                                : v.status === 'DESCONTADO'
                                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                            }`}>
                              {v.status === 'APROVADO' ? '✓ APROVADO' : v.status === 'DESCONTADO' ? '💲 DESCONTADO' : '✗ REPROVADO'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {v.status === 'PENDENTE' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setApprovalModalVale(v);
                                  setApprovalValeAmount(v.valor);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Avaliar</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectionModalVale(v);
                                  setValeRejectionReason('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reprovar</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredValesSorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#B49A73] font-mono">
                        Nenhum registro de vale encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-3">
              {filteredValesSorted.length === 0 ? (
                <div className="text-center py-8 text-[#B49A73] font-mono text-xs">Nenhum vale encontrado.</div>
              ) : filteredValesSorted.map((v) => {
                const vend = users.find(u => u.id === v.vendedorId);
                const filial = filiais.find(f => f.id === v.filialId);

                return (
                  <div key={v.id} className="rounded-2xl border border-[#C8A45D]/20 bg-[#10283D]/80 p-3 text-xs text-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="font-bold text-sm text-[#F1DEB5]">{vend?.name || 'Funcionário'}</div>
                      {v.status === 'PENDENTE' ? (
                        <span className="badge-pendente-alerta">Pendente</span>
                      ) : (
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase border ${
                          v.status === 'APROVADO' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : v.status === 'DESCONTADO' ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300' : 'bg-rose-950/40 border-rose-500/50 text-rose-300'}
                        `}>
                          {v.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#E8D6B5]/80">
                      <div><span className="text-[#B49A73] block">Filial</span>{filial?.name}</div>
                      <div><span className="text-[#B49A73] block">Valor</span>{formatCurrency(v.valor)}</div>
                      <div className="col-span-2"><span className="text-[#B49A73] block">Motivo</span>{v.motivo}</div>
                    </div>

                    {v.status === 'PENDENTE' && (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button onClick={() => { setApprovalModalVale(v); setApprovalValeAmount(v.valor); }} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                          Aprovar
                        </button>
                        <button onClick={() => { setRejectionModalVale(v); setValeRejectionReason(''); }} className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold">
                          Reprovar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="md:hidden w-full bg-[#C8A45D] text-black text-center py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-b-2xl flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(255,90,0,0.5)]">
              <span>←</span>
              Deslize a tabela para ver mais
              <span>→</span>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE REJECTION MODAL */}
      {rejectionModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-600/30 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                Reprovar Atendimento
              </h3>
              <button onClick={() => setRejectionModalRecord(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#E8D6B5]/80 mb-3">
              Informe obrigatoriamente o motivo da reprovação deste serviço. O funcionário poderá visualizar esta justificativa.
            </p>

            {rejectionError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-200">
                {rejectionError}
              </div>
            )}

            <form onSubmit={handleConfirmRejectService} className="space-y-3">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Justificativa da Reprovação *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="ex: Quantidade incorreta / valor cobrado divergente / cancelado pelo solicitante"
                  rows={3}
                  required
                  className="w-full bg-[#10283D] border border-rose-600/40 text-white rounded-xl px-3 py-2 outline-none focus:border-rose-400"
                />
              </div>

              <div className="pt-3 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalRecord(null)}
                  className="px-3.5 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirmar Reprovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VALE REJECTION MODAL */}
      {rejectionModalVale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-600/30 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                Reprovar Solicitação de Vale
              </h3>
              <button onClick={() => setRejectionModalVale(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectVale} className="space-y-3">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Motivo da Reprovação *</label>
                <textarea
                  value={valeRejectionReason}
                  onChange={(e) => setValeRejectionReason(e.target.value)}
                  placeholder="ex: Saldo de comissões insuficiente para este adiantamento"
                  rows={3}
                  required
                  className="w-full bg-[#10283D] border border-rose-600/40 text-white rounded-xl px-3 py-2 outline-none focus:border-rose-400"
                />
              </div>

              <div className="pt-3 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalVale(null)}
                  className="px-3.5 py-2 rounded-xl bg-black/40 text-[#E8D6B5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold"
                >
                  Confirmar Reprovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE DETAILS MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#C8A45D]" />
                Detalhes do Atendimento
              </h3>
              <button onClick={() => setViewingRecord(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Funcionário:</span>
                  <span className="text-white font-bold">{users.find(u => u.id === viewingRecord.vendedorId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Filial:</span>
                  <span className="text-white">{filiais.find(f => f.id === viewingRecord.filialId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Serviço:</span>
                  <span className="text-white">{servicos.find(s => s.id === viewingRecord.servicoId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Quantidade:</span>
                  <span className="text-white font-bold">{viewingRecord.quantidade || 1} atendimento(s)</span>
                </div>
                <div className="flex justify-between">
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Data/Hora:</span>
                  <span className="text-white">{new Date(viewingRecord.dataHora).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Valor Cobrado Total:</span>
                  <span className="text-white font-bold text-sm">{formatCurrency(viewingRecord.valorCobrado)}</span>
                </div>
                <div className="flex justify-between text-[#F1DEB5]">
                  <span>Comissão Funcionário ({viewingRecord.commissionPercent}%):</span>
                  <span className="font-bold text-base">{formatCurrency(viewingRecord.valorComissao)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Destinado ao Salão ({100 - viewingRecord.commissionPercent}%):</span>
                  <span>{formatCurrency(viewingRecord.valorSalao)}</span>
                </div>
                {viewingRecord.observacoes && (
                  <div className="pt-2 border-t border-[#C8A45D]/20 text-[#E8D6B5]">
                    <span className="text-[#B49A73]">Obs:</span> {viewingRecord.observacoes}
                  </div>
                )}
                {viewingRecord.justificativaReprovacao && (
                  <div className="pt-2 border-t border-rose-600/30 text-rose-300">
                    <span className="text-rose-400 font-bold">Justificativa da Reprovação:</span> {viewingRecord.justificativaReprovacao}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 text-right">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL VALE MODAL */}
      {isAddValeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C8A45D]" />
                Lançar Adiantamento Manual
              </h3>
              <button onClick={() => setIsAddValeModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualVale} className="space-y-3">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Funcionário Beneficiário *</label>
                <select
                  value={manualVendedorId}
                  onChange={(e) => setManualVendedorId(e.target.value)}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  {users.filter(u => u.role === 'VENDEDOR' && (currentUser.role === 'ADMIN' || u.filialId === currentUser.filialId)).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Valor do Adiantamento (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={manualValor}
                  onChange={(e) => setManualValor(e.target.value)}
                  placeholder="100.00"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white font-mono font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Motivo / Descrição *</label>
                <textarea
                  value={manualMotivo}
                  onChange={(e) => setManualMotivo(e.target.value)}
                  placeholder="ex: Adiantamento solicitado verbalmente em balcão"
                  rows={2}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div className="pt-3 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddValeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] cursor-pointer"
                >
                  Salvar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LANÇAR ATENDIMENTO EM NOME DO FUNCIONÁRIO MODAL */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#C8A45D]" />
                Lançar Atendimento em Nome do Funcionário
              </h3>
              <button onClick={() => setIsAddServiceModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualService} className="space-y-3">
              {currentUser.role === 'ADMIN' && (
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Filial *</label>
                  <select
                    value={manualServiceFilialId}
                    onChange={(e) => {
                      setManualServiceFilialId(e.target.value);
                      const availableVends = users.filter(u => u.role === 'VENDEDOR' && (e.target.value === 'ALL' || u.filialId === e.target.value));
                      setManualServiceVendedorId(availableVends[0]?.id || '');
                    }}
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  >
                    <option value="ALL">Todas as Filiais</option>
                    {filiais.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {currentUser.role === 'GERENTE' && (
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Filial</label>
                  <div className="bg-[#10283D] border border-[#C8A45D]/20 text-white rounded-xl px-3 py-2 font-mono">
                    {filiais.find(f => f.id === currentUser.filialId)?.name || 'Minha Filial'}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Funcionário *</label>
                <select
                  value={manualServiceVendedorId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setManualServiceVendedorId(newId);
                    const func = users.find(u => u.id === newId);
                    const filteredSrv = servicos.filter(s => s.status === 'ATIVO' && (!func?.funcaoId || !s.funcaoId || s.funcaoId === func.funcaoId));
                    if (!filteredSrv.find(s => s.id === manualServiceServicoId)) {
                      setManualServiceServicoId(filteredSrv[0]?.id || '');
                    }
                  }}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  {manualServiceFuncionarios.length === 0 && <option value="">Nenhum funcionário nesta filial</option>}
                  {manualServiceFuncionarios.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Serviço *</label>
                <select
                  value={manualServiceServicoId}
                  onChange={(e) => setManualServiceServicoId(e.target.value)}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  {servicos
                    .filter(s => {
                      if (s.status !== 'ATIVO') return false;
                      const selectedFunc = users.find(u => u.id === manualServiceVendedorId);
                      if (selectedFunc?.funcaoId && s.funcaoId) {
                        return s.funcaoId === selectedFunc.funcaoId;
                      }
                      return true;
                    })
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.commissionPercent}%)</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={manualServiceQuantidade}
                    onChange={(e) => setManualServiceQuantidade(e.target.value)}
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white font-mono font-bold rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Valor Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualServiceValorUnitario}
                    onChange={(e) => setManualServiceValorUnitario(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white font-mono font-bold rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>


              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Total Cobrado:</span>
                  <span className="text-white font-bold">{formatCurrency(manualServiceTotal)}</span>
                </div>
                <div className="flex justify-between text-[#F1DEB5]">
                  <span>Comissão Funcionário ({manualServiceCommissionPercent}%):</span>
                  <span className="font-bold">{formatCurrency(manualServiceCommission)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Salão:</span>
                  <span>{formatCurrency(manualServiceSalao)}</span>
                </div>
              </div>

              {manualServiceError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{manualServiceError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] cursor-pointer"
                >
                  Lançar Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aprovação de Vale */}
      {approvalModalVale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#081522] rounded-3xl border border-[#C8A45D]/30 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#C8A45D]/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/50 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold font-mono">Aprovar Vale</h3>
                <p className="text-[11px] text-[#D7C08E] font-mono">Ajuste o valor antes de confirmar</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[#D7C08E] text-xs font-mono mb-1">Motivo do Vale:</label>
                <div className="p-3 bg-[#10283D] rounded-xl text-white text-sm border border-[#C8A45D]/20">
                  {approvalModalVale.motivo}
                </div>
              </div>

              <div>
                <label className="block text-[#D7C08E] text-xs font-mono mb-1">Valor Aprovado (R$):</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B] font-mono font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvalValeAmount}
                    onChange={(e) => setApprovalValeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#10283D] border border-emerald-500/50 pl-9 pr-3 py-3 text-white font-mono font-bold rounded-xl outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1.5 flex justify-between">
                  <span>Valor Solicitado Original: {formatCurrency(approvalModalVale.valorSolicitado || approvalModalVale.valor)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setApprovalModalVale(null);
                    setApprovalValeAmount(0);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#C8A45D]/20 text-white font-bold text-xs hover:bg-[#C8A45D]/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const updated = StorageService.approveVale(approvalModalVale.id, currentUser, approvalValeAmount);
                    if (updated) {
                      refreshData();
                      setApprovalModalVale(null);
                      setApprovalValeAmount(0);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 transition-all cursor-pointer"
                >
                  Confirmar Aprovação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Record Modal */}
      <EditServiceModal
        isOpen={isEditServiceModalOpen}
        onClose={() => setIsEditServiceModalOpen(false)}
        record={editingServiceRecord}
        currentUser={currentUser}
        onSaved={refreshData}
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
            refreshData();
          }}
        />
      )}

    </div>
  );
};
