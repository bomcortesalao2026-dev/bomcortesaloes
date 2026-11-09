import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Calendar,
  Building2,
  AlertCircle,
  X,
  Bell,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { RegistroServico, User, Servico, Filial } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';
import { PedidoNotificacaoModal } from './PedidoNotificacaoModal';

interface VendedorMeusServicosProps {
  currentUser: User;
  onNavigateToNew?: () => void;
}

export const VendedorMeusServicos: React.FC<VendedorMeusServicosProps> = ({ 
  currentUser,
  onNavigateToNew
}) => {
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<RegistroServico | null>(null);
  const [notificacaoModalRecord, setNotificacaoModalRecord] = useState<RegistroServico | null>(null);
  const [isRefreshingMs, setIsRefreshingMs] = useState<boolean>(false);
  const [lastRefreshMs, setLastRefreshMs] = useState<string>('');

  const refreshData = () => {
    const allRegs = StorageService.getRegistrosServicos();
    setRegistros(allRegs.filter(r => r.vendedorId === currentUser.id));
    setServicos(StorageService.getServicos());
    setFiliais(StorageService.getFiliais());
    setUsers(StorageService.getUsers());
  };

  const forceRefreshMs = async () => {
    if (isRefreshingMs) return;
    setIsRefreshingMs(true);
    try {
      await StorageService.refreshForScreen('EMPLOYEE');
    } catch {}
    refreshData();
    setLastRefreshMs(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setTimeout(() => setIsRefreshingMs(false), 400);
  };

  useEffect(() => {
    refreshData();
    setLastRefreshMs(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') forceRefreshMs();
    };
    forceRefreshMs();
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [currentUser]);



  const hasOrderNotification = (r: RegistroServico) => {
    const hasRealEdits = r.editHistory && r.editHistory.some(h => {
      if (h.reason || h.previousValue) return true; // Manual edit
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

  const filtered = registros.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const servicoName = servicos.find(s => s.id === r.servicoId)?.name || '';
      const notif = r.notificacao || '';
      const q = searchTerm.toLowerCase();
      const matchService = servicoName.toLowerCase().includes(q);
      const matchNotif = notif.toLowerCase().includes(q);
      if (!matchService && !matchNotif) return false;
    }
    return true;
  });

  const totalNotificacoesCount = registros.filter(r => hasOrderNotification(r)).length;

  const countPendentes = registros.filter(r => r.status === 'PENDENTE').length;
  const countAprovados = registros.filter(r => r.status === 'APROVADO').length;
  const countReprovados = registros.filter(r => r.status === 'REPROVADO').length;
  const countPagos = registros.filter(r => r.status === 'PAGO').length;
  const countTodos = registros.length;

  const getStatusBadge = (status: RegistroServico['status']) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase inline-flex items-center gap-1 whitespace-nowrap border border-amber-500/60 bg-amber-950/60 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
            ⚠ Pendente de Aprovação
          </span>
        );
      case 'APROVADO':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> APROVADO
          </span>
        );
      case 'REPROVADO':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> REPROVADO
          </span>
        );
      case 'PAGO':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> PAGO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#C8A45D]" />
            Meus Atendimentos & Serviços
          </h2>
          <p className="text-xs text-[#B49A73]">
            Acompanhe o status de aprovação de cada atendimento realizado.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('PENDENTE')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'PENDENTE'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 chip-status-pendente-ativo'
                  : 'bg-black/40 border-amber-700/40 text-amber-400/80 hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3 h-3" /> PENDENTES
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                statusFilter === 'PENDENTE' ? 'bg-amber-400/20 text-amber-100' : 'bg-amber-500/20 text-amber-300'
              }`}>{countPendentes}</span>
            </button>
            <button
              onClick={() => setStatusFilter('APROVADO')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'APROVADO'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-black/40 border-emerald-700/40 text-emerald-400/80 hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> APROVADOS
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                statusFilter === 'APROVADO' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-500/20 text-emerald-300'
              }`}>{countAprovados}</span>
            </button>
            <button
              onClick={() => setStatusFilter('REPROVADO')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'REPROVADO'
                  ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : 'bg-black/40 border-rose-700/40 text-rose-400/80 hover:bg-rose-950/40'
              }`}
            >
              <XCircle className="w-3 h-3" /> REPROVADOS
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                statusFilter === 'REPROVADO' ? 'bg-rose-400/20 text-rose-100' : 'bg-rose-500/20 text-rose-300'
              }`}>{countReprovados}</span>
            </button>
            <button
              onClick={() => setStatusFilter('PAGO')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'PAGO'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'bg-black/40 border-cyan-700/40 text-cyan-400/80 hover:bg-cyan-950/40'
              }`}
            >
              <DollarSign className="w-3 h-3" /> PAGOS
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                statusFilter === 'PAGO' ? 'bg-cyan-400/20 text-cyan-100' : 'bg-cyan-500/20 text-cyan-300'
              }`}>{countPagos}</span>
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'ALL'
                  ? 'bg-[#C8A45D]/30 border-[#E2C98A] text-[#F3E6C8] shadow-[0_0_12px_rgba(200,164,93,0.5)]'
                  : 'bg-black/40 border-[#C8A45D]/40 text-[#D7C08E]/80 hover:bg-[#C8A45D]/15'
              }`}
            >
              <Filter className="w-3 h-3" /> TODOS
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                statusFilter === 'ALL' ? 'bg-[#E2C98A]/20 text-[#F3E6C8]' : 'bg-[#C8A45D]/20 text-[#D7C08E]'
              }`}>{countTodos}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
              <input
                type="text"
                placeholder="Buscar por serviço ou aviso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-60"
              />
            </div>

            <div className="flex flex-col items-start gap-1">
              <button
                onClick={forceRefreshMs}
                disabled={isRefreshingMs}
                className="refresh-report-button px-3 py-2 rounded-xl border text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer"
                title="Sincronizar dados agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#E2C98A] ${isRefreshingMs ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <span className="text-[10px] font-mono text-[#D7C08E]">Atualize para ver o relatório</span>
            </div>

            {lastRefreshMs && (
              <span className="text-[10px] font-mono text-[#B49A73] flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                {lastRefreshMs}
              </span>
            )}

            {onNavigateToNew && (
              <button
                onClick={onNavigateToNew}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 cursor-pointer"
              >
                + Novo Atendimento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Services Table / Cards */}
      <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className={`overflow-x-auto custom-scrollbar ${filtered.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full text-left text-xs text-white">
            <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${filtered.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Qtd.</th>
                  <th className="py-3 px-4">Total Cobrado</th>
                <th className="py-3 px-4">Comissão (%)</th>
                <th className="py-3 px-4">Sua Comissão</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Notificação</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10">
              {filtered.map((r) => {
                const s = servicos.find(srv => srv.id === r.servicoId);
                const filial = filiais.find(f => f.id === r.filialId);
                const qty = r.quantidade || 1;
                const hasNotif = hasOrderNotification(r);

                return (
                  <tr key={r.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#B49A73]">
                      {new Date(r.dataHora).toLocaleDateString('pt-BR')} {new Date(r.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {s?.name || 'Serviço Personalizado'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#F1DEB5]">
                      <span className="px-2 py-0.5 rounded bg-[#10283D] border border-[#C8A45D]/30">
                        {qty}x
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-bold">
                      {formatCurrency(r.valorCobrado)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#F1DEB5]">
                      {r.commissionPercent}%
                    </td>
                    <td className="py-3 px-4 font-mono text-[#F1DEB5] font-bold">
                      {formatCurrency(r.valorComissao)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(r.status)}
                    </td>

                    {/* Blinking Notification Button Column */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {hasNotif ? (
                        <button
                          onClick={() => setNotificacaoModalRecord(r)}
                          className="relative px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-[#C8A45D]/35 to-amber-500/25 text-amber-300 border-2 border-amber-400 font-bold text-[11px] inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:brightness-125 active:scale-95 transition-all cursor-pointer"
                          title={r.notificacao ? `Notificação: ${r.notificacao}` : 'Ver avisos e notificações da gerência'}
                        >
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <Bell className="w-3.5 h-3.5 text-amber-300" />
                          <span className="max-w-[100px] truncate text-[10px] font-mono">
                            {r.notificacao ? 'Aviso' : r.motivoReprovacao ? 'Reprovado' : 'Alterado'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[#B49A73]/40 font-mono text-[10px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                          title="Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-[#B49A73] font-mono">
                    Nenhum atendimento encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#C8A45D]" />
                Detalhes do Atendimento
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20">
                <span className="text-[#B49A73]">Status Atual:</span>
                {getStatusBadge(selectedRecord.status)}
              </div>

              {selectedRecord.justificativaReprovacao && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-200">
                  <div className="font-bold flex items-center gap-1 text-rose-400 mb-1">
                    <AlertCircle className="w-4 h-4" /> Motivo da Reprovação:
                  </div>
                  <p>{selectedRecord.justificativaReprovacao}</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-black/40 border border-[#C8A45D]/20 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Serviço:</span>
                  <span className="text-white font-bold">{servicos.find(s => s.id === selectedRecord.servicoId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Quantidade:</span>
                  <span className="text-white font-bold">{selectedRecord.quantidade || 1} atendimento(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Unidade:</span>
                  <span className="text-white">{filiais.find(f => f.id === selectedRecord.filialId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B49A73]">Data/Hora:</span>
                  <span className="text-white">{new Date(selectedRecord.dataHora).toLocaleString('pt-BR')}</span>
                </div>
                <div className="pt-2 border-t border-[#C8A45D]/20 flex justify-between">
                  <span className="text-[#B49A73]">Valor Cobrado:</span>
                  <span className="text-white font-bold text-sm">{formatCurrency(selectedRecord.valorCobrado)}</span>
                </div>
                <div className="flex justify-between text-[#F1DEB5]">
                  <span>Comissão Profissional ({selectedRecord.commissionPercent}%):</span>
                  <span className="font-bold text-base">{formatCurrency(selectedRecord.valorComissao)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Repasse Salão ({100 - selectedRecord.commissionPercent}%):</span>
                  <span>{formatCurrency(selectedRecord.valorSalao)}</span>
                </div>
                {selectedRecord.observacoes && (
                  <div className="pt-2 border-t border-[#C8A45D]/20 text-[11px] text-[#E8D6B5]/80">
                    <span className="text-[#B49A73]">Obs: </span>{selectedRecord.observacoes}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 text-right">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
