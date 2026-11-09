import React, { useState } from 'react';
import { 
  User as UserIcon, 
  KeyRound, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { User, Filial } from '../types';
import { StorageService } from '../services/storage';

interface PerfilModuleProps {
  currentUser: User;
  onUserUpdated: (u: User) => void;
}

export const PerfilModule: React.FC<PerfilModuleProps> = ({ currentUser, onUserUpdated }) => {
  const [name, setName] = useState<string>(currentUser.name);
  const [email, setEmail] = useState<string>(currentUser.email);
  const [phone, setPhone] = useState<string>(currentUser.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!name.trim() || !email.trim()) {
      setProfileError('Preencha os campos obrigatórios.');
      return;
    }

    const allUsers = StorageService.getUsers();
    const updated = allUsers.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        };
      }
      return u;
    });

    StorageService.saveUsers(updated);
    const updatedSelf = updated.find(u => u.id === currentUser.id);
    if (updatedSelf) {
      onUserUpdated(updatedSelf);
    }
    setProfileSuccess('Dados do perfil atualizados com sucesso!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.');
      return;
    }
    if (currentPassword !== currentUser.passwordHash) {
      setPasswordError('A senha atual informada está incorreta.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    const allUsers = StorageService.getUsers();
    const updated = allUsers.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, passwordHash: newPassword };
      }
      return u;
    });

    StorageService.saveUsers(updated);
    StorageService.logAuditoria({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioRole: currentUser.role,
      acao: 'Alteração Própria de Senha',
      registroTipo: 'SISTEMA',
      registroId: currentUser.id,
      registroDescricao: `O usuário alterou sua própria credencial de acesso.`,
    });

    const updatedSelf = updated.find(u => u.id === currentUser.id);
    if (updatedSelf) {
      onUserUpdated(updatedSelf);
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Senha alterada com sucesso!');
  };

  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleResetData = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 5000);
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D2133]/90 border border-[#C8A45D]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D7C08E] mb-1">
          <Shield className="w-4 h-4 text-[#C8A45D]" />
          <span>SEGURANÇA & PREFERÊNCIAS</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Meu Perfil & Configurações de Acesso
        </h2>
        <p className="text-xs text-[#B49A73] mt-0.5">
          Atualize seus dados cadastrais e credenciais de login no sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Info */}
        <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#C8A45D]/20 pb-3">
            <UserIcon className="w-4 h-4 text-[#C8A45D]" />
            Dados Cadastrais
          </h3>

          {profileSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Nome Completo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                required
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-[#C8A45D]/20 font-mono text-[11px] text-[#E8D6B5]/80 space-y-1">
              <div><span className="text-[#B49A73]">Nível de Acesso:</span> <strong className="text-white">{currentUser.role}</strong></div>
              <div><span className="text-[#B49A73]">Identificador:</span> {currentUser.id}</div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold shadow-[0_0_15px_rgba(255,90,0,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Salvar Alterações do Perfil
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="p-6 rounded-2xl bg-[#0B1B2B]/95 border border-[#C8A45D]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#C8A45D]/20 pb-3">
            <KeyRound className="w-4 h-4 text-[#C8A45D]" />
            Alterar Minha Senha
          </h3>

          {passwordSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Senha Atual *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Nova Senha *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <div>
              <label className="block text-[#D7C08E] font-mono mb-1">Confirmar Nova Senha *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full bg-[#10283D] border border-[#C8A45D]/30 text-white rounded-xl px-3 py-2 outline-none focus:border-[#D9B76C]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-black/40 border border-[#C8A45D]/40 text-[#E8D6B5] hover:text-white hover:border-[#D8B56B] font-bold text-xs transition-all cursor-pointer"
            >
              Atualizar Minha Senha
            </button>
          </form>

          {/* Database Reset Option for Demo Testing */}
          {currentUser.role === 'ADMIN' && (
            <div className="pt-4 border-t border-[#C8A45D]/20 text-center">
              <button
                type="button"
                onClick={handleResetData}
                className={`text-[11px] font-mono flex items-center justify-center gap-1.5 mx-auto transition-colors ${
                  confirmingReset ? 'text-rose-400 font-bold animate-pulse' : 'text-[#B49A73] hover:text-rose-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{confirmingReset ? 'Clique novamente para confirmar a restauração' : 'Restaurar Dados Padrão da Demonstração'}</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
