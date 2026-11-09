import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  KeyRound, 
  Building2, 
  Mail, 
  Phone, 
  X, 
  Eye, 
  AlertTriangle,
  Lock
} from 'lucide-react';
import { User, Filial, Funcao } from '../types';
import { StorageService } from '../services/storage';

interface GerentesModuleProps {
  currentUser: User;
}

export const GerentesModule: React.FC<GerentesModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [editingGerente, setEditingGerente] = useState<User | null>(null);
  const [selectedGerenteForPassword, setSelectedGerenteForPassword] = useState<User | null>(null);
  const [viewingGerente, setViewingGerente] = useState<User | null>(null);
  const [deletingGerente, setDeletingGerente] = useState<User | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [filialId, setFilialId] = useState<string>('');
  const [funcaoId, setFuncaoId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Password reset fields
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setFiliais(StorageService.getFiliais());
    setFuncoes(StorageService.getFuncoes());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingGerente(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFilialId(filiais[0]?.id || '');
    setFuncaoId('');
    setPhone('');
    setStatus('ATIVO');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (g: User) => {
    setEditingGerente(g);
    setName(g.name);
    setEmail(g.email);
    setPassword('');
    setConfirmPassword('');
    setFilialId(g.filialId || filiais[0]?.id || '');
    setFuncaoId(g.funcaoId || '');
    setPhone(g.phone || '');
    setStatus(g.status);
    setErrorMsg('');
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

  const handleSaveGerente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }

    if (!editingGerente) {
      if (!password || !confirmPassword) {
        setErrorMsg('Informe a senha para o novo gerente.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        return;
      }
    }

    // Atualiza a lista de usuários diretamente do Supabase antes de checar duplicidade,
    // evitando que emails de usuários já excluídos bloqueiem novos cadastros.
    try {
      await StorageService.refreshCriticalData();
    } catch (_) { /* usa cache local como fallback */ }

    const allUsersList = StorageService.getUsers();
    // check duplicate email
    const duplicate = allUsersList.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== editingGerente?.id);
    if (duplicate) {
      setErrorMsg('Este e-mail já está sendo utilizado por outro usuário.');
      return;
    }


    let updatedList: User[];
    if (editingGerente) {
      updatedList = allUsersList.map(u => {
        if (u.id === editingGerente.id) {
          return {
            ...u,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            filialId: filialId || undefined,
            funcaoId: funcaoId || undefined,
            phone: phone.trim(),
            status,
          };
        }
        return u;
      });
      StorageService.logAuditoria({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        usuarioRole: currentUser.role,
        acao: 'Edição de Gerente',
        registroTipo: 'GERENTE',
        registroId: editingGerente.id,
        registroDescricao: `Gerente ${name} atualizado.`,
      });
    } else {
      const newGerente: User = {
        id: getNextCode('G', allUsersList.filter(u => u.role === 'GERENTE')),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: password,
        role: 'GERENTE',
        filialId: filialId || undefined,
        funcaoId: funcaoId || undefined,
        phone: phone.trim(),
        status,
        createdAt: new Date().toISOString(),
      };
      updatedList = [...allUsersList, newGerente];
      StorageService.logAuditoria({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        usuarioRole: currentUser.role,
        acao: 'Cadastro de Gerente',
        registroTipo: 'GERENTE',
        registroId: newGerente.id,
        registroDescricao: `Gerente ${newGerente.name} cadastrado para filial.`,
      });
    }

    StorageService.saveUsers(updatedList);
    setIsModalOpen(false);
    refreshData();
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGerenteForPassword) return;
    if (!newPassword || newPassword !== confirmNewPassword) {
      setErrorMsg('Senhas não coincidem ou estão vazias.');
      return;
    }

    const allUsersList = StorageService.getUsers();
    const updated = allUsersList.map(u => {
      if (u.id === selectedGerenteForPassword.id) {
        return { ...u, passwordHash: newPassword };
      }
      return u;
    });

    StorageService.saveUsers(updated);
    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Alteração de Senha de Gerente',
      registroTipo: 'GERENTE',
      registroId: selectedGerenteForPassword.id,
      registroDescricao: `Senha alterada pelo administrador para o gerente ${selectedGerenteForPassword.name}.`,
    });

    setIsPasswordModalOpen(false);
    setSelectedGerenteForPassword(null);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleToggleStatus = (g: User) => {
    const allUsersList = StorageService.getUsers();
    const updated = allUsersList.map(u => {
      if (u.id === g.id) {
        return { ...u, status: u.status === 'ATIVO' ? ('INATIVO' as const) : ('ATIVO' as const) };
      }
      return u;
    });
    StorageService.saveUsers(updated);
    refreshData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingGerente) return;
    await StorageService.deleteUser(deletingGerente.id, currentUser);
    setDeletingGerente(null);
    refreshData();
  };

  const gerentes = users.filter(u => u.role === 'GERENTE');
  const filtered = gerentes.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#C8A45D]" />
            Gerentes de Filial
          </h2>
          <p className="text-xs text-[#B49A73]">
            Controle de líderes locais com acesso e operações restritas à sua filial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Buscar gerente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-60"
            />
          </div>

          <button
            id="btn-add-gerente"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Gerente</span>
          </button>
        </div>
      </div>

      {/* Grid of Gerentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => {
          const filial = filiais.find(f => f.id === g.filialId);

          return (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/30 hover:border-[#D9B76C] shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    g.status === 'ATIVO'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    {g.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingGerente(g)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGerenteForPassword(g);
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setErrorMsg('');
                        setIsPasswordModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Alterar Senha"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(g)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(g)}
                      className={`p-1.5 rounded-lg bg-black/40 transition-colors ${
                        g.status === 'ATIVO' ? 'text-amber-400 hover:bg-amber-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                      title={g.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingGerente(g)}
                      className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C8A45D]/20 border border-[#C8A45D]/40 flex items-center justify-center font-bold text-white text-sm">
                    {g.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{g.name}</h3>
                    <div className="text-[11px] text-[#B49A73] truncate">{g.email}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#E8D6B5]/80 bg-black/30 p-2.5 rounded-xl border border-[#C8A45D]/15">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
                    <span className="truncate font-medium">{filial?.name || 'Filial não vinculada'}</span>
                  </div>
                  {g.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
                      <span>{g.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#C8A45D]/20 text-[10px] font-mono text-[#B49A73] flex justify-between">
                <span>ID: {formatIdLabel(g.id, 'G')}</span>
                <span>Role: GERENTE</span>
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
                <UserCheck className="w-4 h-4 text-[#C8A45D]" />
                {editingGerente ? 'Editar Gerente' : 'Cadastrar Novo Gerente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveGerente} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Renata Vasconcelos"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: gerente.jardins@nexusbeauty.com"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Filial Vinculada *</label>
                <select
                  value={filialId}
                  onChange={(e) => setFilialId(e.target.value)}
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  {filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99123-4567"
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              {!editingGerente && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#D7C08E] font-mono mb-1">Senha *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      required
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#D7C08E] font-mono mb-1">Confirmar Senha *</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      required
                      className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ATIVO' | 'INATIVO')}
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
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
                  Salvar Gerente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && selectedGerenteForPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#C8A45D]" />
                Alterar Senha do Gerente
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#E8D6B5]/80 mb-3">
              Defina a nova senha para o gerente <strong className="text-white">{selectedGerenteForPassword.name}</strong>.
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div className="pt-3 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 text-[#E8D6B5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#C8A45D] text-black font-bold"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW GERENTE MODAL */}
      {viewingGerente && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white">Perfil do Gerente</h3>
              <button onClick={() => setViewingGerente(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20">
                <div className="text-sm font-bold text-white">{viewingGerente.name}</div>
                <div className="text-[#D7C08E]">{viewingGerente.email}</div>
                <div className="text-[#B49A73] mt-1">Tel: {viewingGerente.phone || 'Não informado'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 text-[#E8D6B5]">
                <span className="text-[#D7C08E] font-mono">Filial: </span>
                {filiais.find(f => f.id === viewingGerente.filialId)?.name || 'Nenhuma'}
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 text-[#E8D6B5]">
                <span className="text-[#D7C08E] font-mono">Status da Conta: </span>
                <span className={viewingGerente.status === 'ATIVO' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>{viewingGerente.status}</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 text-right">
              <button
                onClick={() => setViewingGerente(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingGerente && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Excluir Gerente?</h3>
            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Deseja remover <strong className="text-white">"{deletingGerente.name}"</strong>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingGerente(null)}
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
