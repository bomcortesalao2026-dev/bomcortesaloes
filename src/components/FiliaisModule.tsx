import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  MapPin, 
  Phone, 
  Users, 
  X, 
  Check, 
  AlertTriangle,
  Eye,
  Sparkles
} from 'lucide-react';
import { Filial, User } from '../types';
import { StorageService } from '../services/storage';

interface FiliaisModuleProps {
  currentUser: User;
}

export const FiliaisModule: React.FC<FiliaisModuleProps> = ({ currentUser }) => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [viewingFilial, setViewingFilial] = useState<Filial | null>(null);
  const [deletingFilial, setDeletingFilial] = useState<Filial | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [complement, setComplement] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('SP');
  const [zip, setZip] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [status, setStatus] = useState<'ATIVA' | 'INATIVA'>('ATIVA');

  const refreshData = () => {
    setFiliais(StorageService.getFiliais());
    setAllUsers(StorageService.getUsers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFilial(null);
    setName('');
    setAddress('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('SP');
    setZip('');
    setPhone('');
    setStatus('ATIVA');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (f: Filial) => {
    setEditingFilial(f);
    setName(f.name);
    setAddress(f.address);
    setNumber(f.number);
    setComplement(f.complement || '');
    setNeighborhood(f.neighborhood);
    setCity(f.city);
    setState(f.state);
    setZip(f.zip);
    setPhone(f.phone);
    setStatus(f.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim()) return;

    const payload: Filial = {
      id: editingFilial ? editingFilial.id : 'filial-' + Date.now(),
      name: name.trim(),
      address: address.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      phone: phone.trim(),
      status,
      createdAt: editingFilial ? editingFilial.createdAt : new Date().toISOString(),
    };

    StorageService.saveFilial(payload, currentUser);
    setIsModalOpen(false);
    refreshData();
  };

  const handleToggleStatus = (f: Filial) => {
    const updated: Filial = {
      ...f,
      status: f.status === 'ATIVA' ? 'INATIVA' : 'ATIVA',
    };
    StorageService.saveFilial(updated, currentUser);
    refreshData();
  };

  const handleConfirmDelete = () => {
    if (!deletingFilial) return;
    StorageService.deleteFilial(deletingFilial.id, currentUser);
    setDeletingFilial(null);
    refreshData();
  };

  const filtered = filiais.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header with Search and New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C8A45D]" />
            Cadastro de Filiais da Rede
          </h2>
          <p className="text-xs text-[#B49A73]">
            Gerencie todas as unidades, endereços e equipes vinculadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
            <input
              type="text"
              placeholder="Buscar filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#10283D] border border-[#C8A45D]/30 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C] placeholder-[#B49A73]/50 w-44 sm:w-60"
            />
          </div>

          <button
            id="btn-add-filial"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Filial</span>
          </button>
        </div>
      </div>

      {/* Grid of Filiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => {
          const managersCount = allUsers.filter(u => u.filialId === f.id && u.role === 'GERENTE').length;
          const stylistsCount = allUsers.filter(u => u.filialId === f.id && u.role === 'VENDEDOR').length;

          return (
            <div
              key={f.id}
              className="p-5 rounded-2xl bg-[#0C1F31]/90 border border-[#C8A45D]/30 hover:border-[#D9B76C] shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    f.status === 'ATIVA'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}>
                    {f.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingFilial(f)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Visualizar Detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(f)}
                      className="p-1.5 rounded-lg bg-black/40 text-[#D7C08E] hover:text-white hover:bg-[#C8A45D]/20 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(f)}
                      className={`p-1.5 rounded-lg bg-black/40 transition-colors ${
                        f.status === 'ATIVA' ? 'text-amber-400 hover:bg-amber-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                      title={f.status === 'ATIVA' ? 'Desativar Filial' : 'Ativar Filial'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFilial(f)}
                      className="p-1.5 rounded-lg bg-black/40 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#E2C98A] transition-colors">
                  {f.name}
                </h3>

                <div className="space-y-1.5 text-xs text-[#E8D6B5]/80">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C8A45D] shrink-0 mt-0.5" />
                    <span>{f.address}, {f.number} {f.complement ? `(${f.complement})` : ''} - {f.neighborhood}, {f.city}/{f.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-[#C8A45D] shrink-0" />
                    <span>{f.phone || 'Sem telefone'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 flex items-center justify-between text-xs font-mono text-[#B49A73]">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#D8B56B]" />
                  <span>{stylistsCount} Profissionais</span>
                </div>
                <span>{managersCount} Gerente(s)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C8A45D]" />
                {editingFilial ? 'Editar Filial' : 'Nova Filial'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#D7C08E] font-mono mb-1">Nome da Filial *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Nexus Beauty Prime - Jardins"
                  required
                  className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[#D7C08E] font-mono mb-1">Logradouro / Endereço *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Alameda Lorena"
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1450"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Complemento</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="ex: Piso 2 / Sl 10"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="ex: Jardins"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Cidade *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    required
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">UF</label>
                  <input
                    type="text"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">CEP</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="01424-001"
                    className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#D7C08E] font-mono mb-1">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3088-9900"
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
              </div>

              <div className="pt-4 border-t border-[#C8A45D]/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white border border-transparent hover:border-[#C8A45D]/30"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)]"
                >
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FILIAL DETAILS MODAL */}
      {viewingFilial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1B2B] border border-[#C8A45D]/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C8A45D]/20 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C8A45D]" />
                Detalhes da Unidade
              </h3>
              <button onClick={() => setViewingFilial(null)} className="text-[#D7C08E] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20">
                <div className="text-sm font-bold text-white">{viewingFilial.name}</div>
                <div className="text-[#D7C08E] mt-1 font-mono">{viewingFilial.address}, nº {viewingFilial.number} {viewingFilial.complement}</div>
                <div className="text-[#B49A73]">{viewingFilial.neighborhood} - {viewingFilial.city}/{viewingFilial.state} - CEP: {viewingFilial.zip}</div>
                <div className="text-[#B49A73] mt-1">Tel: {viewingFilial.phone}</div>
              </div>

              <div>
                <div className="font-mono text-[#D7C08E] mb-2 uppercase tracking-wider">Profissionais Vinculados:</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {allUsers.filter(u => u.filialId === viewingFilial.id).map(u => (
                    <div key={u.id} className="p-2 rounded-lg bg-black/30 border border-[#C8A45D]/15 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white">{u.name}</span>
                        <span className="text-[10px] text-[#D7C08E] ml-2 font-mono">({u.role})</span>
                      </div>
                      <span className="text-[10px] text-[#B49A73]">{u.email}</span>
                    </div>
                  ))}
                  {allUsers.filter(u => u.filialId === viewingFilial.id).length === 0 && (
                    <div className="text-[#B49A73] text-center py-2">Nenhum profissional vinculado a esta filial ainda.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#C8A45D]/20 text-right">
              <button
                onClick={() => setViewingFilial(null)}
                className="px-4 py-2 rounded-xl bg-[#C8A45D] text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingFilial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1B2B] border border-rose-600/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Excluir Filial?</h3>
            <p className="text-xs text-[#E8D6B5]/80 mb-4">
              Tem certeza que deseja remover a filial <strong className="text-white">"{deletingFilial.name}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingFilial(null)}
                className="px-4 py-2 rounded-xl bg-black/40 text-[#E8D6B5] hover:text-white border border-[#C8A45D]/20 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(225,29,72,0.4)]"
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
