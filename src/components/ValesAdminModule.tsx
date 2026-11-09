import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  User as UserIcon, 
  DollarSign, 
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Vale, User, Filial } from '../types';
import { StorageService } from '../services/storage';
import { sortByValeStatusPriority } from '../utils/approvalFilters';
import { formatCurrency } from '../utils/exportUtils';

interface ValesAdminModuleProps {
  currentUser: User;
}

export const ValesAdminModule: React.FC<ValesAdminModuleProps> = ({ currentUser }) => {
  const [vales, setVales] = useState<Vale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);

  // Filters
  // SEMPRE abre com PENDENTE selecionado — não precisa rolar a tela
  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE');
  const [selectedFilial, setSelectedFilial] = useState<string>(
    currentUser.role === 'ADMIN' ? 'ALL' : (currentUser.filialId || 'ALL')
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [rejectionModalVale, setRejectionModalVale] = useState<Vale | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // New Vale Manual Form
  const [manualVendedorId, setManualVendedorId] = useState<string>('');
  const [manualValor, setManualValor] = useState<string>('');
  const [manualMotivo, setManualMotivo] = useState<string>('');
  
  const [approvalModalVale, setApprovalModalVale] = useState<Vale | null>(null);
  const [approvalValeAmount, setApprovalValeAmount] = useState<number>(0);

  const refreshData = () => {
    setVales(StorageService.getVales());
    setUsers(StorageService.getUsers());
    setFiliais(StorageService.getFiliais());
  };

  useEffect(() => {
    refreshData();
    const sync = async () => {
      await StorageService.refreshForScreen('APPROVALS');
      refreshData();
    };
    sync();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => document.removeEventListener('visibilitychange', refreshOnReturn);
  }, []);

  const handleApprove = (valeId: string) => {
    StorageService.approveVale(valeId, currentUser);
    try {
      confetti({
        particleCount: 40,
        spread: 40,
        colors: ['#10b981', '#ffffff', '#C8A45D']
      });
    } catch {}
    refreshData();
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalVale) return;
    if (!rejectionReason.trim()) return;

    StorageService.rejectVale(rejectionModalVale.id, currentUser, rejectionReason.trim(), rejectionReason.trim());
    setRejectionModalVale(null);
    setRejectionReason('');
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
    const motivoFinal = `[Lançamento Manual] ${manualMotivo.trim()}`;
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
      acao: 'Solicitação de Vale (Lançamento Gerencial/Admin)',
      registroTipo: 'VALE',
      registroId: salvo.id,
      registroDescricao: `Vale para ${targetUser?.name || manualVendedorId} - R$ ${salvo.valor.toFixed(2)}`,
      detalhes: motivoFinal,
    });

    setIsAddModalOpen(false);
    setManualValor('');
    setManualMotivo('');
    refreshData();
  };

  const filtered = vales.filter(v => {
    if (currentUser.role !== 'ADMIN' && currentUser.filialId && v.filialId !== currentUser.filialId) return false;
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (selectedFilial !== 'ALL' && v.filialId !== selectedFilial) return false;
    if (searchTerm) {
      const vendName = users.find(u => u.id === v.vendedorId)?.name || '';
      const matchName = vendName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMotivo = v.motivo.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchMotivo) return false;
    }
    return true;
  });
  // PENDENTES SEMPRE NO TOPO
  const filteredSorted: Vale[] = sortByValeStatusPriority(filtered);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#C8A45D]" />
            Gestão de Vales & Adiantamentos
          </h2>
          <p className="text-xs text-[#B49A73]">
            Aprovação de solicitações de adiantamento e controle de saldos para desconto no fechamento.
          </p>
        </div>

        <button
          onClick={() => {
            const availableVends = users.filter(u => u.role === 'VENDEDOR' && (currentUser.role === 'ADMIN' || u.filialId === currentUser.filialId));
            if (availableVends.length > 0) {
              setManualVendedorId(availableVends[0].id);
            }
            setManualValor('');
            setManualMotivo('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Vale Manual</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADO">Aprovados (Aguardando Desconto)</option>
            <option value="DESCONTADO">Descontados em Pagamento</option>
            <option value="REPROVADO">Reprovados</option>
          </select>
        </div>

        {currentUser.role === 'ADMIN' && (
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
        )}

        <div>
          <label className="block text-[11px] font-mono text-[#D7C08E] mb-1">Busca</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Profissional ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className={`overflow-x-auto custom-scrollbar ${filteredSorted.length > 10 ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full text-left text-xs text-white">
            <thead className={`bg-[#10283D] text-[#D7C08E] font-mono border-b border-[#C8A45D]/20 uppercase ${filteredSorted.length > 10 ? 'sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : ''}`}>
              <tr>
                <th className="py-3 px-4">Data Solicitação</th>
                <th className="py-3 px-4">Funcionário</th>
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Motivo / Finalidade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8A45D]/10">
              {filteredSorted.map((v) => {
                const vend = users.find(u => u.id === v.vendedorId);
                const filial = filiais.find(f => f.id === v.filialId);

                return (
                  <tr key={v.id} className="hover:bg-[#C8A45D]/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#B49A73]">
                      {new Date(v.dataSolicitacao).toLocaleDateString('pt-BR')} {new Date(v.dataSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {vend?.name || 'Funcionário'}
                    </td>
                    <td className="py-3 px-4 text-[#E8D6B5]/80">
                      {filial?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-bold text-sm">
                      {formatCurrency(v.valor)}
                    </td>
                    <td className="py-3 px-4 text-[#E8D6B5]/80 max-w-xs truncate">
                      {v.motivo}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        v.status === 'APROVADO'
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                          : v.status === 'PENDENTE'
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                          : v.status === 'DESCONTADO'
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'PENDENTE' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setApprovalModalVale(v);
                              setApprovalValeAmount(v.valor);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Avaliar Vale</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectionModalVale(v);
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all cursor-pointer"
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

              {filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#B49A73] font-mono">
                    Nenhum registro de vale encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL VALE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C8A45D]" />
                Lançar Adiantamento Manual
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#D7C08E] hover:text-white">
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
                  placeholder="0.00"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white font-mono font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50"
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)]"
                >
                  Salvar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
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

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Motivo da Reprovação *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
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
                    StorageService.approveVale(approvalModalVale.id, currentUser, approvalValeAmount);
                    refreshData();
                    setApprovalModalVale(null);
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

    </div>
  );
};
