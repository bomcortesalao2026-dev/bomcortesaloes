import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  X, 
  AlertTriangle,
  Users
} from 'lucide-react';
import { Funcao, User } from '../types';
import { StorageService } from '../services/storage';

interface FuncoesModuleProps {
  currentUser: User;
}

export const FuncoesModule: React.FC<FuncoesModuleProps> = ({ currentUser }) => {
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFuncao, setEditingFuncao] = useState<Funcao | null>(null);
  const [deletingFuncao, setDeletingFuncao] = useState<Funcao | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'ATIVA' | 'INATIVA'>('ATIVA');

  const refreshData = () => {
    setFuncoes(StorageService.getFuncoes());
    setAllUsers(StorageService.getUsers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFuncao(null);
    setName('');
    setDescription('');
    setStatus('ATIVA');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (fn: Funcao) => {
    setEditingFuncao(fn);
    setName(fn.name);
    setDescription(fn.description);
    setStatus(fn.status);
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

    const payload: Funcao = {
      id: editingFuncao ? editingFuncao.id : getNextCode('FUN', funcoes),
      name: name.trim(),
      description: description.trim(),
      status,
      createdAt: editingFuncao ? editingFuncao.createdAt : new Date().toISOString(),
    };

    StorageService.saveFuncao(payload, currentUser);
    setIsModalOpen(false);
    refreshData();
  };

  const handleToggleStatus = (fn: Funcao) => {
    const updated: Funcao = {
      ...fn,
      status: fn.status === 'ATIVA' ? 'INATIVA' : 'ATIVA',
    };
    StorageService.saveFuncao(updated, currentUser);
    refreshData();
  };

  const handleConfirmDelete = () => {
    if (!deletingFuncao) return;
    StorageService.deleteFuncao(deletingFuncao.id, currentUser);
    setDeletingFuncao(null);
    refreshData();
  };

  const filtered = funcoes.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#C8A45D]" />
            Funções & Especialidades do Salão
          </h2>
          <p className="text-xs text-[#B49A73]">
            Cargos utilizados para associar profissionais e especialidades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Buscar função..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-60"
            />
          </div>

          <button
            id="btn-add-funcao"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Função</span>
          </button>
        </div>
      </div>

      {/* Grid of Functions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((fn) => {
          const associatedProfessionals = allUsers.filter(u => u.funcaoId === fn.id).length;

          return (
            <div
              key={fn.id}
              className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/30 hover:border-[#D9B76C] shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    fn.status === 'ATIVA'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    {fn.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(fn)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(fn)}
                      className={`p-1.5 rounded-lg bg-black/40 transition-colors ${
                        fn.status === 'ATIVA' ? 'text-amber-400 hover:bg-amber-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                      title={fn.status === 'ATIVA' ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFuncao(fn)}
                      className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{fn.name}</h3>
                <p className="text-xs text-[#E8D6B5]/80 line-clamp-3 mb-3">{fn.description || 'Sem descrição detalhada.'}</p>
              </div>

              <div className="pt-3 border-t border-[#C8A45D]/20 flex items-center justify-between text-xs font-mono text-[#B49A73]">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#D8B56B]" />
                  <span>{associatedProfessionals} Profissionais</span>
                </div>
                <span>ID: {formatIdLabel(fn.id, 'FUN')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#C8A45D]" />
                {editingFuncao ? 'Editar Função' : 'Cadastrar Nova Função'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nome da Função *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Cabeleireiro Master, Barbeiro, Manicure"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ATIVA' | 'INATIVA')}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)]"
                >
                  Salvar Função
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingFuncao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Excluir Função?</h3>
            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Deseja remover a função <strong className="text-white">"{deletingFuncao.name}"</strong>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingFuncao(null)}
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
