import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  KeyRound, 
  Building2, 
  Briefcase, 
  Scissors, 
  Phone, 
  Mail, 
  X, 
  Eye, 
  AlertTriangle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { User, Filial, Funcao, RegistroServico } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/exportUtils';
import employeesIcon from '../assets/images/employees_icon_1787794536367.jpg';

interface VendedoresModuleProps {
  currentUser: User;
}

export const VendedoresModule: React.FC<VendedoresModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [registros, setRegistros] = useState<RegistroServico[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFilialFilter, setSelectedFilialFilter] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [editingVendedor, setEditingVendedor] = useState<User | null>(null);
  const [selectedVendedorForPassword, setSelectedVendedorForPassword] = useState<User | null>(null);
  const [viewingVendedor, setViewingVendedor] = useState<User | null>(null);
  const [deletingVendedor, setDeletingVendedor] = useState<User | null>(null);

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
  const [isSavingVendedor, setIsSavingVendedor] = useState<boolean>(false);

  // Password reset fields
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setFiliais(StorageService.getFiliais());
    setFuncoes(StorageService.getFuncoes());
    setRegistros(StorageService.getRegistrosServicos());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVendedor(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFilialId(currentUser.role === 'GERENTE' ? (currentUser.filialId || '') : (filiais[0]?.id || ''));
    setFuncaoId(funcoes[0]?.id || '');
    setPhone('');
    setStatus('ATIVO');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: User) => {
    setEditingVendedor(v);
    setName(v.name);
    setEmail(v.email);
    setPassword('');
    setConfirmPassword('');
    setFilialId(v.filialId || filiais[0]?.id || '');
    setFuncaoId(v.funcaoId || funcoes[0]?.id || '');
    setPhone(v.phone || '');
    setStatus(v.status);
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

  const handleSaveVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingVendedor) return;
    setErrorMsg('');

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }

    if (!editingVendedor) {
      if (!password || !confirmPassword) {
        setErrorMsg('Informe a senha para o novo funcionário.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        return;
      }
    }

    setIsSavingVendedor(true);
    try {
      await StorageService.refreshCriticalData();
      const allUsersList = StorageService.getUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = allUsersList.find(u => u.email.toLowerCase() === normalizedEmail && u.id !== editingVendedor?.id);
      if (duplicate) {
        setErrorMsg('Este e-mail já está sendo utilizado por outro usuário.');
        return;
      }

      let updatedList: User[];
      let userToSave: User;
      if (editingVendedor) {
        const existingUser = allUsersList.find(u => u.id === editingVendedor.id);
        if (!existingUser) {
          throw new Error('Não foi possível encontrar o funcionário que está sendo editado.');
        }
        userToSave = {
          ...existingUser,
          name: name.trim(),
          email: normalizedEmail,
          filialId: currentUser.role === 'GERENTE' ? (currentUser.filialId || existingUser.filialId) : filialId,
          funcaoId,
          phone: phone.trim(),
          status,
        };
        updatedList = allUsersList.map(u => {
          return u.id === editingVendedor.id ? userToSave : u;
        });
      } else {
        userToSave = {
          id: getNextCode('F', allUsersList.filter(u => u.role === 'VENDEDOR')),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: password,
          role: 'VENDEDOR',
          filialId: currentUser.role === 'GERENTE' ? (currentUser.filialId || '') : filialId,
          funcaoId,
          phone: phone.trim(),
          status,
          createdAt: new Date().toISOString(),
        };
        updatedList = [...allUsersList, userToSave];
      }

      await StorageService.saveUserAndWait(userToSave, updatedList);

      if (editingVendedor) {
        StorageService.logAuditoria({
          usuarioId: currentUser.id,
          usuarioNome: currentUser.name,
          usuarioRole: currentUser.role,
          acao: 'Edição de Funcionário',
          registroTipo: 'VENDEDOR',
          registroId: editingVendedor.id,
          registroDescricao: `Funcionário ${name} atualizado.`,
        });
      } else {
        StorageService.logAuditoria({
          usuarioId: currentUser.id,
          usuarioNome: currentUser.name,
          usuarioRole: currentUser.role,
          acao: 'Cadastro de Funcionário',
          registroTipo: 'VENDEDOR',
          registroId: userToSave.id,
          registroDescricao: `Funcionário ${userToSave.name} cadastrado.`,
        });
      }

      setIsModalOpen(false);
      refreshData();
    } catch (error) {
      console.error('[Supabase] Não foi possível salvar o funcionário:', error);
      if (error instanceof Error) {
        setErrorMsg(`Não foi possível salvar no banco de dados: ${error.message}`);
      } else if (error && typeof error === 'object') {
        const message = 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Erro retornado pelo Supabase.';
        const code = 'code' in error && typeof error.code === 'string' ? ` (código ${error.code})` : '';
        setErrorMsg(`Não foi possível salvar no banco de dados: ${message}${code}`);
      } else {
        setErrorMsg('Não foi possível salvar no banco de dados: erro inesperado retornado pelo Supabase.');
      }
    } finally {
      setIsSavingVendedor(false);
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendedorForPassword) return;
    if (!newPassword || newPassword !== confirmNewPassword) {
      setErrorMsg('Senhas não coincidem ou estão vazias.');
      return;
    }

    const allUsersList = StorageService.getUsers();
    const updated = allUsersList.map(u => {
      if (u.id === selectedVendedorForPassword.id) {
        return { ...u, passwordHash: newPassword };
      }
      return u;
    });

    StorageService.saveUsers(updated);
    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Alteração de Senha de Funcionário',
      registroTipo: 'VENDEDOR',
      registroId: selectedVendedorForPassword.id,
      registroDescricao: `Senha alterada para o funcionário ${selectedVendedorForPassword.name}.`,
    });

    setIsPasswordModalOpen(false);
    setSelectedVendedorForPassword(null);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleToggleStatus = (v: User) => {
    const allUsersList = StorageService.getUsers();
    const updated = allUsersList.map(u => {
      if (u.id === v.id) {
        return { ...u, status: u.status === 'ATIVO' ? ('INATIVO' as const) : ('ATIVO' as const) };
      }
      return u;
    });
    StorageService.saveUsers(updated);
    refreshData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingVendedor) return;
    await StorageService.deleteUser(deletingVendedor.id, currentUser);
    setDeletingVendedor(null);
    refreshData();
  };

  // Filter vendors based on role and filters
  const vendedores = users.filter(u => {
    if (u.role !== 'VENDEDOR') return false;
    if (currentUser.role === 'GERENTE' && u.filialId !== currentUser.filialId) return false;
    if (selectedFilialFilter !== 'ALL' && u.filialId !== selectedFilialFilter) return false;
    return true;
  });

  const filtered = vendedores.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <img 
              src={employeesIcon} 
              alt="Funcionários" 
              className="w-7 h-7 rounded-lg object-cover border border-[#C8A45D]/40 shadow-[0_0_10px_rgba(255,90,0,0.3)]" 
              referrerPolicy="no-referrer"
            />
            Corpo de Funcionários & Profissionais
          </h2>
          <p className="text-xs text-[#B49A73]">
            Cabeleireiros, barbeiros, manicures, atendentes e especialistas de toda a rede.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser.role === 'ADMIN' && (
            <select
              value={selectedFilialFilter}
              onChange={(e) => setSelectedFilialFilter(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
            >
              <option value="ALL">Todas as Filiais</option>
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-56"
            />
          </div>

          <button
            id="btn-add-vendedor"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Funcionário</span>
          </button>
        </div>
      </div>

      {/* Grid of Vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const filial = filiais.find(f => f.id === v.filialId);
          const funcao = funcoes.find(fn => fn.id === v.funcaoId);
          
          const vendServices = registros.filter(r => r.vendedorId === v.id && (r.status === 'APROVADO' || r.status === 'PAGO'));
          const totalSales = vendServices.reduce((sum, r) => sum + r.valorCobrado, 0);
          const totalCommission = vendServices.reduce((sum, r) => sum + r.valorComissao, 0);

          return (
            <div
              key={v.id}
              className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/30 hover:border-[#D9B76C] shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    v.status === 'ATIVO'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    {v.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingVendedor(v)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Ver Desempenho"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVendedorForPassword(v);
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
                      onClick={() => handleOpenEditModal(v)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Editar Função/Filial"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(v)}
                      className={`p-1.5 rounded-lg bg-black/40 transition-colors ${
                        v.status === 'ATIVO' ? 'text-amber-400 hover:bg-amber-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                      title={v.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => setDeletingVendedor(v)}
                        className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8A45D] to-[#731900] flex items-center justify-center font-bold text-white text-sm shadow-[0_0_10px_rgba(255,90,0,0.4)]">
                    <Scissors className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{v.name}</h3>
                    <div className="text-[11px] font-mono text-[#D7C08E] truncate">
                      {funcao?.name || 'Profissional Geral'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#E8D6B5]/80 bg-black/40 p-2.5 rounded-xl border border-[#C8A45D]/15 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
                    <span className="truncate font-medium">{filial?.name || 'Sem filial'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
                    <span className="truncate">{v.email}</span>
                  </div>
                </div>

                {/* Performance pill */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs p-2 rounded-xl bg-[#C8A45D]/10 border border-[#C8A45D]/25">
                  <div>
                    <div className="text-[9px] font-mono text-[#B49A73] uppercase">Vendas Realizadas</div>
                    <div className="font-bold text-white font-mono">{formatCurrency(totalSales)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-[#B49A73] uppercase">Comissões</div>
                    <div className="font-bold text-[#F1DEB5] font-mono">{formatCurrency(totalCommission)}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#C8A45D]/20 text-[10px] font-mono text-[#B49A73] flex justify-between">
                <span>{vendServices.length} atendimentos</span>
                <span>ID: {formatIdLabel(v.id, 'F')}</span>
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
                <Users className="w-4 h-4 text-[#C8A45D]" />
                {editingVendedor ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
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

            <form onSubmit={handleSaveVendedor} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nome Completo do Funcionário *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Lucas Fontes"
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
                  placeholder="ex: lucas.hair@nexusbeauty.com"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Função / Cargo *</label>
                  <select
                    value={funcaoId}
                    onChange={(e) => setFuncaoId(e.target.value)}
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  >
                    {funcoes.map(fn => (
                      <option key={fn.id} value={fn.id}>{fn.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Filial *</label>
                  <select
                    value={filialId}
                    onChange={(e) => setFilialId(e.target.value)}
                    disabled={currentUser.role === 'GERENTE'}
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C] disabled:opacity-50"
                  >
                    {filiais.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 97777-1111"
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              {!editingVendedor && (
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
                  disabled={isSavingVendedor}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSavingVendedor ? 'Salvando...' : 'Salvar Funcionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && selectedVendedorForPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#C8A45D]" />
                Alterar Senha do Funcionário
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#E8D6B5]/80 mb-3">
              Defina a nova senha para <strong className="text-white">{selectedVendedorForPassword.name}</strong>.
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
                  placeholder="Confirme a senha"
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

      {/* VIEW PERFORMANCE MODAL */}
      {viewingVendedor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C8A45D]" />
                Desempenho & Extrato do Funcionário
              </h3>
              <button onClick={() => setViewingVendedor(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 mb-4">
              <div className="text-sm font-bold text-white">{viewingVendedor.name}</div>
              <div className="text-[#D7C08E] font-mono">
                {funcoes.find(fn => fn.id === viewingVendedor.funcaoId)?.name} • {filiais.find(f => f.id === viewingVendedor.filialId)?.name}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[#D7C08E] uppercase tracking-wider">Histórico de Atendimentos:</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                {registros.filter(r => r.vendedorId === viewingVendedor.id).map(r => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-black/30 border border-[#C8A45D]/15 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Atendimento</div>
                      <div className="text-[10px] text-[#B49A73]">{new Date(r.dataHora).toLocaleDateString('pt-BR')} • {r.status}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-white font-bold">{formatCurrency(r.valorCobrado)}</div>
                      <div className="text-[10px] text-[#D7C08E]">Comissão: {formatCurrency(r.valorComissao)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 text-right">
              <button
                onClick={() => setViewingVendedor(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingVendedor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Excluir Funcionário?</h3>
            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Deseja remover o funcionário <strong className="text-white">"{deletingVendedor.name}"</strong> da base de dados?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingVendedor(null)}
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
