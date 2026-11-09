import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  DollarSign, 
  Percent, 
  X, 
  AlertTriangle,
  Calculator,
  Sparkles,
  FolderTree,
  Briefcase
} from 'lucide-react';
import { Servico, Funcao, User } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';

interface ServicosModuleProps {
  currentUser: User;
}

export const ServicosModule: React.FC<ServicosModuleProps> = ({ currentUser }) => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFuncaoFilter, setSelectedFuncaoFilter] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [deletingServico, setDeletingServico] = useState<Servico | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [commissionPercent, setCommissionPercent] = useState<string>('');
  const [funcaoId, setFuncaoId] = useState<string>('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  const refreshData = () => {
    const loadedServicos = StorageService.getServicos();
    const loadedFuncoes = StorageService.getFuncoes();
    setServicos(loadedServicos);
    setFuncoes(loadedFuncoes);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingServico(null);
    setName('');
    setCommissionPercent('');
    setFuncaoId('');
    setStatus('ATIVO');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Servico) => {
    setEditingServico(s);
    setName(s.name);
    setCommissionPercent(s.commissionPercent !== undefined ? s.commissionPercent.toString() : '');
    setFuncaoId(s.funcaoId || '');
    setStatus(s.status);
    setIsModalOpen(true);
  };

  const getNextCode = (prefix: string, list: Array<{ id: string }>) => {
    const maxNumber = list.reduce((max, item) => {
      const match = item.id.match(new RegExp(`^${prefix}0*(\\d+)$`, 'i'));
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    return `${prefix}${String(maxNumber + 1).padStart(2, '0')}`;
  };

  const formatIdLabel = (id: string, fallbackPrefix: string) => {
    const match = id.match(new RegExp(`^${fallbackPrefix}0*(\\d+)$`, 'i'));
    if (match) return `${fallbackPrefix}${match[1]}`;
    return id;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: Servico = {
      id: editingServico ? editingServico.id : getNextCode('SEV', servicos),
      name: name.trim(),
      description: editingServico?.description || '',
      defaultPrice: editingServico?.defaultPrice || 0,
      commissionPercent: parseFloat(commissionPercent) || 0,
      funcaoId: funcaoId || undefined,
      status,
      createdAt: editingServico ? editingServico.createdAt : new Date().toISOString(),
    };

    StorageService.saveServico(payload, currentUser);
    setIsModalOpen(false);
    refreshData();
  };

  const handleToggleStatus = (s: Servico) => {
    const updated: Servico = {
      ...s,
      status: s.status === 'ATIVO' ? 'INATIVO' : 'ATIVO',
    };
    StorageService.saveServico(updated, currentUser);
    refreshData();
  };

  const handleConfirmDelete = () => {
    if (!deletingServico) return;
    StorageService.deleteServico(deletingServico.id, currentUser);
    setDeletingServico(null);
    refreshData();
  };

  const simPct = Number(commissionPercent) || 0;
  const simSalaoPct = Math.max(0, 100 - simPct);

  const filtered = servicos.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFuncao = selectedFuncaoFilter === 'ALL' || (s.funcaoId === selectedFuncaoFilter);
    return matchesSearch && matchesFuncao;
  });

  return (
    <div className="space-y-6">
      
      {/* Control Header */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#C8A45D]" />
              Catálogo de Serviços & Regras de Comissão
            </h2>
            <p className="text-xs text-[#B49A73]">
              Defina percentuais de comissão vinculados às funções.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-60"
              />
            </div>

            <button
              id="btn-add-servico"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          </div>
        </div>

        {/* Funcao quick filter chips */}
        {funcoes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar">
            <button
              onClick={() => setSelectedFuncaoFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                selectedFuncaoFilter === 'ALL'
                  ? 'bg-[#C8A45D] text-white font-bold shadow-[0_0_10px_rgba(255,90,0,0.4)]'
                  : 'bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/5 border border-[#C8A45D]/20'
              }`}
            >
              Todos ({servicos.length})
            </button>
            {funcoes.map(func => {
              const count = servicos.filter(s => s.funcaoId === func.id).length;
              const isSelected = selectedFuncaoFilter === func.id;
              return (
                <button
                  key={func.id}
                  onClick={() => setSelectedFuncaoFilter(func.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#C8A45D] text-white font-bold shadow-[0_0_10px_rgba(255,90,0,0.4)]'
                      : 'bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#0C1F31]/90/5 border border-[#C8A45D]/20'
                  }`}
                >
                  <span>{func.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/40 text-white' : 'bg-[#C8A45D]/20 text-[#F1DEB5]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const comPct = s.commissionPercent || 0;
          const salaoPct = Math.max(0, 100 - comPct);

          return (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/30 hover:border-[#D9B76C] shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      s.status === 'ATIVO'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`p-1.5 rounded-lg bg-black/40 transition-colors cursor-pointer ${
                        s.status === 'ATIVO' ? 'text-amber-400 hover:bg-amber-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                      title={s.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingServico(s)}
                      className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{s.name}</h3>
                {s.funcaoId && (
                  <div className="mb-2 inline-flex items-center gap-1 text-[10px] bg-[#C8A45D]/20 text-[#F1DEB5] px-2 py-0.5 rounded border border-[#C8A45D]/30">
                    <Briefcase className="w-3 h-3" />
                    <span>{funcoes.find(f => f.id === s.funcaoId)?.name || 'Função não encontrada'}</span>
                  </div>
                )}

                {/* Commission Breakdown Box */}
                <div className="p-3 rounded-xl bg-black/50 border border-[#C8A45D]/20 space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#D8B56B] flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      Comissão do Profissional:
                    </span>
                    <span className="text-[#F1DEB5] font-bold text-sm">{comPct}%</span>
                  </div>

                  <div className="pt-2 border-t border-[#C8A45D]/15 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-[#C8A45D]/10 p-2 rounded-lg text-center">
                      <div className="text-[#D7C08E] text-[9px] uppercase">Profissional</div>
                      <div className="font-bold text-white text-sm">{comPct}%</div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg text-center">
                      <div className="text-[#B49A73] text-[9px] uppercase">Salão</div>
                      <div className="font-bold text-emerald-400 text-sm">{salaoPct}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-[#B49A73] flex justify-between">
                <span>Cálculo Automático por Atendimento</span>
                <span>ID: {formatIdLabel(s.id, 'SEV')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#C8A45D]" />
                {editingServico ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#D7C08E] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nome do Procedimento / Serviço *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Corte Feminino, Barba, Mechas, Escova..."
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1 truncate" title="Vincular Função do Profissional">
                    Função do Prof. *
                  </label>
                  <select
                    value={funcaoId}
                    onChange={(e) => setFuncaoId(e.target.value)}
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#D9B76C] text-xs"
                  >
                    <option value="" disabled>Selecione uma Função</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.status === 'INATIVA' ? '(Inativa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ATIVO' | 'INATIVO')}
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#D9B76C] text-xs"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Percentual de Comissão (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="ex: 40"
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-[#F1DEB5] rounded-xl px-3 py-2.5 outline-none focus:border-[#D9B76C] font-mono font-bold text-sm placeholder-[#B49A73]/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D8B56B] font-mono font-bold">%</span>
                </div>
              </div>

              {/* Commission Simulation Preview Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#183A55] to-[#0B1C2C] border border-[#D9B76C] space-y-2">
                <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                  <Calculator className="w-3.5 h-3.5 text-[#C8A45D]" />
                  <span>Divisão Percentual Automática:</span>
                </div>
                <div className="text-[11px] text-[#E8D6B5]/80">
                  O valor será inserido no momento do atendimento. A divisão de comissão será calculada automaticamente:
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                  <div className="p-2.5 rounded-lg bg-black/50 border border-[#C8A45D]/30">
                    <div className="text-[9px] text-[#D7C08E]">Comissão Profissional</div>
                    <div className="text-base font-black text-white">{simPct}%</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/50 border border-[#C8A45D]/30">
                    <div className="text-[9px] text-emerald-400">Restante para o Salão</div>
                    <div className="text-base font-black text-emerald-400">{simSalaoPct}%</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingServico && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Excluir Serviço?</h3>
            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Deseja remover <strong className="text-white">"{deletingServico.name}"</strong> do catálogo?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingServico(null)}
                className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white border border-[#C8A45D]/20 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
