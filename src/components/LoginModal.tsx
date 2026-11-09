import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { User as UserType } from '../types';
import { SalonLogo } from './SalonLogo';

interface LoginModalProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>(() => localStorage.getItem('SAVED_LOGIN_EMAIL') || '');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);
  const [registeringAdmin, setRegisteringAdmin] = useState<boolean>(false);

  // Mode: 'LOGIN' | 'FIRST_ACCESS_ADMIN'
  const [mode, setMode] = useState<'LOGIN' | 'FIRST_ACCESS_ADMIN'>('LOGIN');

  const reCheckAdmin = () => {
    const adminExists = StorageService.hasAnyAdmin();
    setHasAdmin(adminExists);
    if (adminExists) {
      setMode('LOGIN');
    } else {
      setMode('FIRST_ACCESS_ADMIN');
    }
  };

  useEffect(() => {
    reCheckAdmin();
    const t1 = setTimeout(reCheckAdmin, 500);
    const t2 = setTimeout(reCheckAdmin, 2000);
    const t3 = setTimeout(reCheckAdmin, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // First Access Admin Form Fields
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPhone, setAdminPhone] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState<string>('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Informe o e-mail para acessar.');
      return;
    }

    const users = StorageService.getUsers();
    const target = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!target) {
      setErrorMsg('Usuário não encontrado. Verifique o e-mail digitado.');
      return;
    }

    if (target.status === 'INATIVO') {
      setErrorMsg('Este usuário está inativo no sistema. Contate a administração.');
      return;
    }

    StorageService.setCurrentUser(target);
    localStorage.setItem('SAVED_LOGIN_EMAIL', target.email);

    StorageService.logAuditoria({
      usuarioId: target.id,
      usuarioNome: target.name,
      usuarioRole: target.role,
      acao: 'Login no Sistema',
      registroTipo: 'AUTH',
      registroId: target.id,
      registroDescricao: `Login efetuado com sucesso via credencial ${target.email}`,
    });

    onLoginSuccess(target);
  };

  const handleRegisterFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim() || !adminConfirmPassword.trim()) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (adminPassword.length < 4) {
      setErrorMsg('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setErrorMsg('A confirmação de senha não confere com a senha informada.');
      return;
    }

    const users = StorageService.getUsers();
    const alreadyExists = users.some(u => u.email.toLowerCase() === adminEmail.trim().toLowerCase());
    if (alreadyExists) {
      setErrorMsg('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    setRegisteringAdmin(true);
    try {
      const newAdmin = await StorageService.registerFirstAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim() || undefined,
        passwordHash: adminPassword,
      });

      setHasAdmin(true);
      setMode('LOGIN');
      StorageService.setCurrentUser(newAdmin);
      setSuccessMsg('Administrador cadastrado com sucesso! Acesse novamente com seu e-mail e senha.');
      setTimeout(() => {
        onLoginSuccess(newAdmin);
      }, 800);
    } catch (error) {
      console.error('[LoginModal] Falha ao cadastrar primeiro administrador:', error);
      setErrorMsg('Não foi possível confirmar o cadastro do administrador no banco. Verifique a conexão e tente novamente.');
    } finally {
      setRegisteringAdmin(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      
      {/* Central Login Holographic Card */}
      <div className="w-full max-w-md relative rounded-3xl bg-[#091827]/95 border border-[#C8A45D]/40 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(255,90,0,0.2)] p-6 sm:p-8 overflow-hidden">
        
        {/* Glow corners */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A45D]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C8A45D]/10 blur-3xl pointer-events-none"></div>

        {/* Brand / Logo Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex justify-center mb-3">
            <SalonLogo size="4xl" showSubtitle={false} />
          </div>

          <h2 className="text-xl font-bold text-white tracking-wide font-mono">
            {mode === 'FIRST_ACCESS_ADMIN' ? 'CADASTRO DE ADMINISTRADOR' : 'PAINEL CORPORATIVO'}
          </h2>
          <p className="text-xs text-[#B49A73] mt-1">
            {mode === 'FIRST_ACCESS_ADMIN' 
              ? 'Configure a conta master do responsável pela rede de salões'
              : 'Gestão Unificada de Comissões, Vendas e Salões'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* MODE 1: STANDARD LOGIN */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1.5 uppercase tracking-wider">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: admin@nexusbeauty.com"
                  required
                  className="w-full bg-[#0D2031]/90 border border-[#C8A45D]/30 focus:border-[#D9B76C] focus:ring-1 focus:ring-[#D9B76C] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-[#B49A73]/50"
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#C8A45D] via-[#D9B76C] to-[#9F7B2E] text-white font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(255,90,0,0.5)] hover:shadow-[0_0_35px_rgba(255,90,0,0.8)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Primeiro Acesso link (ONLY displayed if no admin registered yet) */}
            {!hasAdmin && (
              <div className="pt-3 border-t border-[#C8A45D]/20 text-center">
                <button
                  type="button"
                  id="btn-first-access-admin"
                  onClick={() => {
                    setMode('FIRST_ACCESS_ADMIN');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-[#E2C98A] hover:text-white font-medium hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#C8A45D]" />
                  <span>Primeiro acesso — Cadastrar Administrador</span>
                </button>
              </div>
            )}

            {/* Botão de Limpar Cache */}
            <div className={`pt-3 text-center ${hasAdmin ? 'border-t border-[#C8A45D]/20' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  const savedEmail = localStorage.getItem('SAVED_LOGIN_EMAIL');
                  localStorage.clear();
                  sessionStorage.clear();
                  if (savedEmail) localStorage.setItem('SAVED_LOGIN_EMAIL', savedEmail);
                  window.location.href = window.location.pathname + '?reload=' + new Date().getTime();
                }}
                className="text-[10px] text-[#B49A73] hover:text-white font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-colors bg-[#0D2031] border border-[#C8A45D]/30 px-3 py-1.5 rounded-lg hover:bg-[#C8A45D]/20"
                title="Isso vai apagar os dados salvos e forçar o download da versão mais nova do sistema."
              >
                <RefreshCw className="w-3 h-3" />
                <span>Limpar Cache & Atualizar App</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: FIRST ACCESS - REGISTER ADMIN */}
        {mode === 'FIRST_ACCESS_ADMIN' && (
          <form onSubmit={handleRegisterFirstAdmin} className="space-y-3.5 relative z-10">
            <div className="p-3 rounded-xl bg-[#C8A45D]/15 border border-[#C8A45D]/40 text-xs text-[#E8D6B5]">
              <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C8A45D]" />
                Primeiro Acesso // Cadastro de Administrador
              </div>
              Cadastre o administrador geral responsável pela gestão de toda a rede de salões.
            </div>

            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1">
                Nome Completo do Administrador
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  id="admin-register-name"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="ex: Carlos Albuquerque"
                  required
                  className="w-full bg-[#0D2031]/90 border border-[#C8A45D]/30 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#D7C08E] mb-1">
                E-mail Corporativo de Login
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                <input
                  id="admin-register-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="ex: admin@nexusbeauty.com"
                  required
                  className="w-full bg-[#0D2031]/90 border border-[#C8A45D]/30 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-mono text-[#D7C08E] mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                  <input
                    id="admin-register-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    className="w-full bg-[#0D2031]/90 border border-[#C8A45D]/30 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#D7C08E] mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#D8B56B]" />
                  <input
                    id="admin-register-confirm-password"
                    type="password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    className="w-full bg-[#0D2031]/90 border border-[#C8A45D]/30 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#D9B76C]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="admin-register-submit-btn"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#9F7B2E] text-white font-bold text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(255,90,0,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{registeringAdmin ? 'Confirmando cadastro...' : 'Cadastrar Administrador & Acessar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {hasAdmin && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-[#D7C08E] hover:text-white underline cursor-pointer"
                >
                  ← Voltar para o Login
                </button>
              </div>
            )}
          </form>
        )}

      </div>

    </div>
  );
};
