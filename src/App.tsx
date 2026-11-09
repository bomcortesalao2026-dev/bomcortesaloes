import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { User, ActiveModule } from './types';
import { StorageService } from './services/storage';
import { CyberBackground } from './components/CyberBackground';
import { CyberSidebar } from './components/CyberSidebar';
import { CyberHeader } from './components/CyberHeader';
import { LoginModal } from './components/LoginModal';
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const FiliaisModule = lazy(() => import('./components/FiliaisModule').then(m => ({ default: m.FiliaisModule })));
const GerentesModule = lazy(() => import('./components/GerentesModule').then(m => ({ default: m.GerentesModule })));
const VendedoresModule = lazy(() => import('./components/VendedoresModule').then(m => ({ default: m.VendedoresModule })));
const FuncoesModule = lazy(() => import('./components/FuncoesModule').then(m => ({ default: m.FuncoesModule })));
const ServicosModule = lazy(() => import('./components/ServicosModule').then(m => ({ default: m.ServicosModule })));
const AprovacoesModule = lazy(() => import('./components/AprovacoesModule').then(m => ({ default: m.AprovacoesModule })));
const ValesAdminModule = lazy(() => import('./components/ValesAdminModule').then(m => ({ default: m.ValesAdminModule })));
const PagamentosModule = lazy(() => import('./components/PagamentosModule').then(m => ({ default: m.PagamentosModule })));
const RelatoriosModule = lazy(() => import('./components/RelatoriosModule').then(m => ({ default: m.RelatoriosModule })));
const PerfilModule = lazy(() => import('./components/PerfilModule').then(m => ({ default: m.PerfilModule })));
const ConfiguracoesModule = lazy(() => import('./components/ConfiguracoesModule').then(m => ({ default: m.ConfiguracoesModule })));
const VendedorRegistroServico = lazy(() => import('./components/VendedorRegistroServico').then(m => ({ default: m.VendedorRegistroServico })));
const VendedorMeusServicos = lazy(() => import('./components/VendedorMeusServicos').then(m => ({ default: m.VendedorMeusServicos })));
const VendedorMinhasComissoes = lazy(() => import('./components/VendedorMinhasComissoes').then(m => ({ default: m.VendedorMinhasComissoes })));
const VendedorValesModule = lazy(() => import('./components/VendedorValesModule').then(m => ({ default: m.VendedorValesModule })));
const VendedorMeusPagamentos = lazy(() => import('./components/VendedorMeusPagamentos').then(m => ({ default: m.VendedorMeusPagamentos })));
const VendedorDashboard = lazy(() => import('./components/VendedorDashboard').then(m => ({ default: m.VendedorDashboard })));

import {
  calculateWeekCycle,
  getPreviousWeekCycle,
  getEffectiveNow,
  getWeekdayName,
  CycleGatekeeperStatus,
} from './utils/dateCycleUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ActiveModule>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingValesCount, setPendingValesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncMessage, setSyncMessage] = useState<string>('Sincronizando dados...');

  const [configSenhaOk, setConfigSenhaOk] = useState<boolean>(false);
  const [configSenhaModalOpen, setConfigSenhaModalOpen] = useState<boolean>(false);
  const [configSenhaInput, setConfigSenhaInput] = useState<string>('');
  const [configSenhaErro, setConfigSenhaErro] = useState<string>('');
  const [configSenhaTentativas, setConfigSenhaTentativas] = useState<number>(0);
  const CONFIG_SENHA = 'Gcipione2026';

  const [nowTick, setNowTick] = useState<number>(0);

  const [overrideMotivo, setOverrideMotivo] = useState<string>('');
  const [showLiberacaoOverride, setShowLiberacaoOverride] = useState<boolean>(false);

  const [blockedForVendedor, setBlockedForVendedor] = useState<null | 'NAO_PAGO_CICLO_ANTERIOR'>(null);
  const [vendedorNegativeMode, setVendedorNegativeMode] = useState<boolean>(false);

  const [showForceUpdate, setShowForceUpdate] = useState<boolean>(false);
  const CURRENT_APP_VERSION = 'v2.2'; // Change this string to trigger cache clear

  useEffect(() => {
    const savedVer = localStorage.getItem('BOMCORTE_APP_VERSION');
    if (savedVer !== CURRENT_APP_VERSION) {
      setShowForceUpdate(true);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setNowTick(x => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const gatekeeper = useMemo(() => {
    void nowTick;
    const now = getEffectiveNow();
    const dayOfWeek = now.getDay();
    const currentWeek = calculateWeekCycle(now);
    const prevWeek = getPreviousWeekCycle(now);
    const fechamentoStatus = StorageService.verificarFechamentoSemanaAnterior(
      prevWeek.startDateStr, prevWeek.endDateStr
    );
    let status: CycleGatekeeperStatus = 'CICLO_ABERTO';
    if (dayOfWeek === 0) {
      status = 'DOMINGO_ABERTO';
    } else if (dayOfWeek === 6) {
      status = 'FECHAMENTO_HOJE';
    } else if (dayOfWeek === 1) {
      status = fechamentoStatus.todosPagos ? 'CICLO_LIBERADO' : 'LIBERACAO_PENDENTE';
    }
    const diaLabel = getWeekdayName(dayOfWeek) + ', ' + now.toLocaleDateString('pt-BR');
    return { status, currentWeek, prevWeek, fechamentoStatus, now, dayOfWeek, diaLabel };
  }, [nowTick]);

  useEffect(() => {
    if (!currentUser) return;
    setBlockedForVendedor(null);
    setVendedorNegativeMode(false);
    if (currentUser.role === 'VENDEDOR') {
      if (gatekeeper.status === 'LIBERACAO_PENDENTE') {
        const isNaoPago = gatekeeper.fechamentoStatus.naoPagos.some(x => x.userId === currentUser.id);
        const isNegativo = gatekeeper.fechamentoStatus.saldoNegativo.some(x => x.userId === currentUser.id);
        if (isNaoPago) {
          setBlockedForVendedor('NAO_PAGO_CICLO_ANTERIOR');
          return;
        }
        if (isNegativo) {
          setVendedorNegativeMode(true);
        }
      } else {
        const devedor = StorageService.getSaldoNegativoDevedor(currentUser.id);
        if (devedor > 0) setVendedorNegativeMode(true);
      }
    }
  }, [currentUser, gatekeeper.status, gatekeeper.fechamentoStatus, nowTick]);

  const refreshPendingCounts = (user: User | null = currentUser) => {
    const services = StorageService.getRegistrosServicos();
    const vales = StorageService.getVales();
    const isAdmin = user?.role === 'ADMIN';
    const userFilialId = user?.filialId;

    setPendingCount(
      services.filter(s =>
        s.status === 'PENDENTE' &&
        (isAdmin || !userFilialId || s.filialId === userFilialId)
      ).length
    );
    setPendingValesCount(
      vales.filter(v =>
        v.status === 'PENDENTE' &&
        (isAdmin || !userFilialId || v.filialId === userFilialId)
      ).length
    );
  };

  // Initialize from storage (agora é assíncrono com Supabase)
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        setSyncMessage('Conectando ao banco de dados Supabase...');
        await StorageService.init();
        StorageService.setupRealtimeSubscriptions();
        if (!mounted) return;
        setSyncMessage('Carregando dados...');
        const session = StorageService.getCurrentSession();
        refreshPendingCounts(session);
        if (session) {
          setCurrentUser(session);
          if (session.role === 'VENDEDOR') {
            setActiveModule('REGISTRAR_SERVICO');
          } else {
            setActiveModule('DASHBOARD');
          }
        } else {
          setIsLoginModalOpen(true);
        }
      } catch (err) {
        console.warn('Erro no bootstrap, usando modo offline:', err);
        // Modo offline fallback
        const session = StorageService.getCurrentSession();
        refreshPendingCounts(session);
        if (session) {
          setCurrentUser(session);
          if (session.role === 'VENDEDOR') {
            setActiveModule('REGISTRAR_SERVICO');
          } else {
            setActiveModule('DASHBOARD');
          }
        } else {
          setIsLoginModalOpen(true);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    refreshPendingCounts(user);
    if (user.role === 'VENDEDOR') {
      setActiveModule('REGISTRAR_SERVICO');
    } else {
      setActiveModule('DASHBOARD');
    }
  };

  const handleSwitchUser = (user: User) => {
    StorageService.setCurrentSession(user);
    setCurrentUser(user);
    refreshPendingCounts(user);
    if (user.role === 'VENDEDOR') {
      setActiveModule('REGISTRAR_SERVICO');
    } else {
      setActiveModule('DASHBOARD');
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentSession(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const handleNavigate = (module: ActiveModule) => {
    if (module === 'CONFIGURACOES' && !configSenhaOk) {
      setConfigSenhaInput('');
      setConfigSenhaErro('');
      setConfigSenhaModalOpen(true);
      return;
    }
    if (currentUser?.role === 'VENDEDOR' && vendedorNegativeMode) {
      const allowedMods: ActiveModule[] = [
        'DASHBOARD', 'REGISTRAR_SERVICO', 'VENDEDOR_REGISTRO',
        'MEUS_SERVICOS', 'VENDEDOR_SERVICOS', 'MINHAS_COMISSOES',
        'VENDEDOR_COMISSOES', 'MEUS_PAGAMENTOS', 'VENDEDOR_PAGAMENTOS',
        'PERFIL'
      ];
      if (!allowedMods.includes(module)) {
        setActiveModule('REGISTRAR_SERVICO');
        setSidebarOpen(false);
        refreshPendingCounts();
        return;
      }
    }
    setActiveModule(module);
    setSidebarOpen(false);
    refreshPendingCounts();
  };

  const handleLiberacaoOverride = () => {
    if (!currentUser || !overrideMotivo.trim()) return;
    StorageService.logCycleOverride(
      overrideMotivo.trim(),
      'LIBERACAO_ANTECIPADA',
      currentUser,
      `Liberação antecipada ciclo ${gatekeeper.currentWeek.formattedLabel} — não pagos: ${gatekeeper.fechamentoStatus.naoPagos.length}`
    );
    try {
      const res = StorageService.limparHistoricoAoIniciarNovoCiclo(
        gatekeeper.prevWeek.startDateStr,
        gatekeeper.prevWeek.endDateStr,
        currentUser
      );
      if (res.limpou) {
        console.log('[Ciclo] Limpeza automática via LIBERAÇÃO ANTECIPADA concluída.', res.resumo);
      } else if (res.motivoSkip) {
        console.log('[Ciclo] Limpeza pulada (override):', res.motivoSkip);
      }
    } catch (e) {
      console.warn('[Ciclo] Falha na limpeza durante override:', e);
    }
    setBlockedForVendedor(null);
    setShowLiberacaoOverride(false);
    setOverrideMotivo('');
  };

  const handleConfigSenhaSubmit = () => {
    if (configSenhaInput === CONFIG_SENHA) {
      setConfigSenhaOk(true);
      setConfigSenhaModalOpen(false);
      setConfigSenhaTentativas(0);
      setActiveModule('CONFIGURACOES');
      setSidebarOpen(false);
    } else {
      const novas = configSenhaTentativas + 1;
      setConfigSenhaTentativas(novas);
      if (novas >= 3) {
        setConfigSenhaErro('Acesso bloqueado. Muitas tentativas incorretas.');
        setTimeout(() => setConfigSenhaModalOpen(false), 2000);
      } else {
        setConfigSenhaErro(`Senha incorreta. Tentativa ${novas} de 3.`);
      }
      setConfigSenhaInput('');
    }
  };

  const renderActiveModule = () => {
    if (!currentUser) return null;

    if (blockedForVendedor && currentUser.role === 'VENDEDOR') {
      return null;
    }

    switch (activeModule) {
      case 'DASHBOARD':
        if (currentUser.role === 'VENDEDOR') {
          return (
            <VendedorDashboard
              currentUser={currentUser}
              onNavigate={(mod) => handleNavigate(mod as ActiveModule)}
            />
          );
        }
        return (
          <AdminDashboard 
            currentUser={currentUser} 
            onNavigate={(mod) => handleNavigate(mod as ActiveModule)}
          />
        );

      case 'FILIAIS':
        return <FiliaisModule currentUser={currentUser} />;

      case 'GERENTES':
        return <GerentesModule currentUser={currentUser} />;

      case 'VENDEDORES':
        return <VendedoresModule currentUser={currentUser} />;

      case 'FUNCOES':
        return <FuncoesModule currentUser={currentUser} />;

      case 'SERVICOS':
        return <ServicosModule currentUser={currentUser} />;

      case 'APROVACOES':
        return <AprovacoesModule currentUser={currentUser} />;

      case 'VALES':
        return <ValesAdminModule currentUser={currentUser} />;

      case 'PAGAMENTOS':
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'GERENTE') {
          return (
            <AdminDashboard 
              currentUser={currentUser} 
              onNavigate={(mod) => handleNavigate(mod as ActiveModule)}
            />
          );
        }
        return <PagamentosModule currentUser={currentUser} />;

      case 'RELATORIOS':
        return <RelatoriosModule currentUser={currentUser} />;

      case 'PERFIL':
        return (
          <PerfilModule 
            currentUser={currentUser} 
            onUserUpdated={(u) => setCurrentUser(u)} 
          />
        );

      case 'CONFIGURACOES':
        if (!configSenhaOk) {
          return (
            <AdminDashboard 
              currentUser={currentUser} 
              onNavigate={(mod) => handleNavigate(mod as ActiveModule)}
            />
          );
        }
        return (
          <ConfiguracoesModule 
            currentUser={currentUser} 
          />
        );

      case 'REGISTRAR_SERVICO':
      case 'VENDEDOR_REGISTRO':
        return (
          <VendedorRegistroServico 
            currentUser={currentUser} 
            onSuccessNavigate={() => handleNavigate('MEUS_SERVICOS')}
            negativeMode={vendedorNegativeMode}
          />
        );

      case 'MEUS_SERVICOS':
      case 'VENDEDOR_SERVICOS':
        return (
          <VendedorMeusServicos 
            currentUser={currentUser} 
            onNavigateToNew={() => handleNavigate('REGISTRAR_SERVICO')}
          />
        );

      case 'MINHAS_COMISSOES':
      case 'VENDEDOR_COMISSOES':
        return <VendedorMinhasComissoes currentUser={currentUser} />;

      case 'SOLICITAR_VALE':
      case 'MEUS_VALES':
      case 'VENDEDOR_VALES':
        if (vendedorNegativeMode) {
          return (
            <div className="bg-gradient-to-br from-red-950/50 to-orange-950/30 border-2 border-red-500/50 rounded-3xl p-8 text-center space-y-4 shadow-[0_0_60px_rgba(239,68,68,0.2)]">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center mx-auto shadow-2xl">
                <span className="text-5xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-black text-red-300 tracking-wide">VALES BLOQUEADOS</h2>
              <p className="text-[#B49A73]/90 text-sm max-w-md mx-auto">
                Você está em <span className="font-bold text-red-400">Modo Quitação de Saldo Negativo</span>.
                A solicitação de vales está desativada até que todo o saldo devido seja quitado com os seus serviços.
              </p>
              <button
                onClick={() => handleNavigate('REGISTRAR_SERVICO')}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#C8A45D] to-[#ff8c42] text-black font-black hover:scale-105 transition-transform shadow-xl cursor-pointer"
              >
                IR PARA REGISTRAR SERVIÇO E QUITAR SALDO
              </button>
            </div>
          );
        }
        return <VendedorValesModule currentUser={currentUser} />;

      case 'MEUS_PAGAMENTOS':
      case 'VENDEDOR_PAGAMENTOS':
        return <VendedorMeusPagamentos currentUser={currentUser} />;

      default:
        return (
          <AdminDashboard 
            currentUser={currentUser} 
            onNavigate={(mod) => handleNavigate(mod as ActiveModule)}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-[#070302] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
        <CyberBackground />
        <div className="relative z-10 flex flex-col items-center gap-6 p-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#C8A45D] to-[#ff8c42] flex items-center justify-center shadow-[0_0_60px_rgba(255,90,0,0.6)] animate-pulse">
            <span className="text-4xl font-black text-black">BC</span>
          </div>
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-black tracking-wider text-[#D7C08E] drop-shadow-[0_0_14px_rgba(255,90,0,0.7)]">
              BOM CORTE SALÕES
            </h1>
            <p className="text-sm font-mono text-[#B49A73]/80 animate-pulse">
              {syncMessage}
            </p>
            <div className="w-64 h-1.5 bg-[#C8A45D]/15 rounded-full overflow-hidden mx-auto mt-6 border border-[#C8A45D]/20">
              <div className="h-full bg-gradient-to-r from-[#C8A45D] to-[#ff8c42] animate-[loading_1.5s_ease-in-out_infinite]" style={{width: '60%'}}></div>
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#B49A73]/40 mt-8 max-w-sm text-center">
            Modo híbrido: Supabase online com cache local de segurança
          </p>
        </div>
        <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      </div>
    );
  }

  const CycleBadge = () => {
    const cfg: Record<CycleGatekeeperStatus, { bg: string; border: string; text: string; label: string; pulse?: boolean }> = {
      CICLO_ABERTO:       { bg: 'from-emerald-600/30 to-emerald-800/20', border: 'border-emerald-500/60', text: 'text-emerald-300', label: '● CICLO ABERTO', pulse: false },
      FECHAMENTO_HOJE:    { bg: 'from-yellow-600/30 to-orange-700/20',  border: 'border-yellow-500/60',  text: 'text-yellow-300',  label: '⚠ FECHAMENTO HOJE', pulse: true },
      DOMINGO_ABERTO:     { bg: 'from-emerald-600/30 to-teal-700/20',    border: 'border-emerald-500/60', text: 'text-emerald-300', label: '● DOMINGO · ACESSO LIBERADO', pulse: false },
      LIBERACAO_PENDENTE: { bg: 'from-orange-700/40 to-amber-900/30',   border: 'border-orange-500/70', text: 'text-orange-300',  label: `🔓 LIBERAÇÃO PENDENTE (${gatekeeper.fechamentoStatus.naoPagos.length})`, pulse: true },
      CICLO_LIBERADO:     { bg: 'from-emerald-600/30 to-teal-700/20',   border: 'border-emerald-500/60',text: 'text-emerald-300', label: '✓ CICLO LIBERADO', pulse: false },
    };
    const c = cfg[gatekeeper.status];
    const deveExibir =
      gatekeeper.status === 'LIBERACAO_PENDENTE' ||
      gatekeeper.status === 'FECHAMENTO_HOJE';
    if (!deveExibir) return null;
    return (
      <div className={`fixed z-[100] right-2 sm:right-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} ${c.pulse ? 'animate-pulse' : ''} shadow-xl sm:shadow-2xl backdrop-blur-md top-[68px] sm:top-4 max-w-[calc(100%-1rem)] sm:max-w-none`}>
        <div className={`text-[11px] sm:text-xs font-black tracking-wider sm:tracking-widest ${c.text} whitespace-nowrap`}>{c.label}</div>
        <div className="text-[9px] sm:text-[10px] font-mono text-white/60 mt-0.5 truncate max-w-[260px] sm:max-w-none">{gatekeeper.diaLabel}</div>
      </div>
    );
  };

  const BloqueioNaoPago = () => {
    const info = currentUser ? gatekeeper.fechamentoStatus.naoPagos.find(x => x.userId === currentUser.id) : null;
    const isAdminGer = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'GERENTE');
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="w-full max-w-xl bg-gradient-to-br from-[#0D1F30] via-orange-950/40 to-[#0D1F30] border-2 border-orange-500/60 rounded-3xl shadow-[0_0_120px_rgba(249,115,22,0.35)] p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-orange-600 to-amber-800 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(249,115,22,0.5)]">
              <span className="text-6xl">🔒</span>
            </div>
            <h1 className="text-3xl font-black text-orange-300 tracking-wider drop-shadow">LIBERAÇÃO PENDENTE</h1>
            <p className="text-xl font-bold text-white">Pagamento do ciclo anterior ainda não realizado</p>
            <p className="text-[#B49A73]/90 text-sm max-w-md mx-auto">
              O fechamento da semana de <span className="font-bold text-[#C8A45D]">{gatekeeper.prevWeek.formattedLabel}</span> ainda não foi efetuado para você.
              O aplicativo só será liberado após o administrador realizar o pagamento.
            </p>
            {info && (
              <div className="mt-4 p-5 rounded-2xl bg-black/50 border border-orange-500/30 space-y-2">
                <p className="text-xs uppercase tracking-widest text-white/50 font-mono">Valores pendentes do ciclo anterior</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Comissão total do período:</span>
                  <span className="text-lg font-black text-[#D7C08E]">R$ {info.totalComissao.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm font-bold text-orange-300">Status:</span>
                  <span className="text-sm font-black text-orange-400">AGUARDANDO PAGAMENTO</span>
                </div>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-orange-500/20 space-y-3">
            <p className="text-xs text-center text-[#B49A73]/70">
              Procure o administrador da unidade para efetuar o fechamento.
            </p>
            {isAdminGer && !showLiberacaoOverride && (
              <button
                onClick={() => { setShowLiberacaoOverride(true); setOverrideMotivo(''); }}
                className="w-full py-3 rounded-2xl border border-dashed border-[#C8A45D]/50 text-[#C8A45D] text-sm font-bold hover:bg-[#C8A45D]/10 transition cursor-pointer"
              >
                🔓 {currentUser?.role}: Liberar por exceção (registrado em auditoria)
              </button>
            )}
            {showLiberacaoOverride && (
              <div className="space-y-3">
                <p className="text-xs text-[#B49A73] font-bold">Motivo da liberação antecipada (auditado):</p>
                <textarea
                  value={overrideMotivo}
                  onChange={(e) => setOverrideMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Urgência operacional, pagamento efetuado manualmente fora do sistema, etc."
                  className="w-full bg-black/60 border border-[#C8A45D]/40 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#C8A45D] outline-none resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowLiberacaoOverride(false); setOverrideMotivo(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/70 text-sm font-bold hover:bg-white/5 cursor-pointer"
                  >Cancelar</button>
                  <button
                    disabled={!overrideMotivo.trim()}
                    onClick={handleLiberacaoOverride}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A45D] to-[#ff8c42] text-black font-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                  >Confirmar Liberação</button>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 cursor-pointer"
            >Sair / Trocar usuário</button>
          </div>
        </div>
      </div>
    );
  };

  const vendedorBlockedScreen =
    blockedForVendedor === 'NAO_PAGO_CICLO_ANTERIOR' ? <BloqueioNaoPago /> : null;

  return (
    <div className="relative min-h-screen bg-[var(--nexus-bg)] text-[var(--nexus-text)] flex flex-col font-sans selection:bg-[#C8A45D] selection:text-white overflow-x-hidden">
      <CyberBackground />

      {currentUser && <CycleBadge />}

      {isLoginModalOpen && (
        <LoginModal 
          onLoginSuccess={handleLoginSuccess}
          onClose={currentUser ? () => setIsLoginModalOpen(false) : undefined}
        />
      )}

      {vendedorBlockedScreen}

      {currentUser && !vendedorBlockedScreen && (
        <div className="relative z-10 flex min-h-screen">
          <CyberSidebar
            currentUser={currentUser}
            activeModule={activeModule}
            onNavigate={handleNavigate}
            onSelectModule={handleNavigate}
            onLogout={handleLogout}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            pendingCount={pendingCount}
            pendingValesCount={pendingValesCount}
          />

          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-[320px]">
            <CyberHeader
              currentUser={currentUser}
              activeModule={activeModule}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onSelectModule={handleNavigate}
              pendingApprovalsCount={pendingCount + pendingValesCount}
              onLogout={handleLogout}
              vendedorNegativeMode={vendedorNegativeMode}
              gatekeeperStatus={gatekeeper.status}
              fechamentoStatus={gatekeeper.fechamentoStatus}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {vendedorNegativeMode && currentUser.role === 'VENDEDOR' && activeModule !== 'MEUS_VALES' && (
                (() => {
                  const devedor = StorageService.getSaldoNegativoDevedor(currentUser.id);
                  const ativo = StorageService.getSaldoNegativoAtivo(currentUser.id);
                  const progresso = ativo ? Math.min(100, ((ativo.valorQuitado / ativo.valorDevido) * 100)) : 0;
                  return (
                    <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-red-950/70 via-orange-900/40 to-red-950/70 border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-xl">
                          <span className="text-3xl">💸</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-red-200 tracking-wide">⚠️ VOCÊ ESTÁ EM MODO DE QUITAÇÃO</h3>
                          <p className="text-xs text-[#B49A73]/90 mt-1">
                            O valor das suas comissões <span className="font-bold text-red-300">será usado primeiro para quitar o saldo negativo</span> do ciclo anterior.
                            Os vales estão bloqueados até a quitação total.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-black/40 border border-red-500/20">
                          <p className="text-[10px] uppercase font-mono text-white/50 tracking-wider">Saldo Devedor</p>
                          <p className="text-xl font-black text-red-300">R$ {devedor.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-black/40 border border-orange-500/20">
                          <p className="text-[10px] uppercase font-mono text-white/50 tracking-wider">Já Quitado</p>
                          <p className="text-xl font-black text-orange-300">R$ {ativo?.valorQuitado?.toFixed?.(2) || '0.00'}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-black/40 border border-[#C8A45D]/30 col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-mono text-white/50 tracking-wider">Progresso de quitação</p>
                            <p className="text-sm font-black text-[#D7C08E]">{progresso.toFixed(0)}%</p>
                          </div>
                          <div className="w-full h-3 rounded-full bg-black/60 border border-[#C8A45D]/20 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 transition-all duration-500" style={{ width: progresso + '%' }} />
                          </div>
                        </div>
                      </div>
                      {activeModule !== 'REGISTRAR_SERVICO' && (
                        <button
                          onClick={() => handleNavigate('REGISTRAR_SERVICO')}
                          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#C8A45D] to-[#ff8c42] text-black font-black hover:scale-[1.01] active:scale-[0.99] transition shadow-2xl cursor-pointer"
                        >
                          ▶ REGISTRAR NOVO SERVIÇO E QUITAR SALDO MAIS RÁPIDO
                        </button>
                      )}
                    </div>
                  );
                })()
              )}

              {gatekeeper.status === 'LIBERACAO_PENDENTE' && (currentUser.role === 'ADMIN' || currentUser.role === 'GERENTE') && activeModule !== 'PAGAMENTOS' && (
                <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-orange-950/70 via-amber-900/40 to-orange-950/70 border-2 border-orange-500/60 shadow-[0_0_60px_rgba(249,115,22,0.3)] space-y-4 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center flex-shrink-0 shadow-2xl">
                      <span className="text-4xl">📢</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-orange-200 tracking-wide">ATENÇÃO · LIBERAÇÃO PENDENTE</h3>
                      <p className="text-sm text-[#B49A73] mt-1">
                        {gatekeeper.fechamentoStatus.naoPagos.length} vendedor(es) ainda NÃO FORAM PAGOS do ciclo anterior
                        (<span className="font-bold text-[#C8A45D]">{gatekeeper.prevWeek.formattedLabel}</span>).
                        O aplicativo está travado para estes funcionários até o pagamento ser efetuado.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {gatekeeper.fechamentoStatus.naoPagos.slice(0, 8).map(np => (
                          <span key={np.userId} className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-xs font-bold text-red-200">
                            ❌ {np.userName}
                          </span>
                        ))}
                        {gatekeeper.fechamentoStatus.saldoNegativo.slice(0, 4).map(sn => (
                          <span key={sn.userId} className="px-3 py-1.5 rounded-xl bg-orange-950/60 border border-orange-500/40 text-xs font-bold text-orange-200">
                            ⚠ {sn.userName} (R$ -{sn.valorDevido.toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigate('PAGAMENTOS')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-black font-black text-lg hover:scale-[1.01] active:scale-[0.99] transition shadow-2xl cursor-pointer"
                  >
                    ⏭ IR PARA FECHAMENTO E PAGAMENTO AGORA
                  </button>
                </div>
              )}

              <Suspense fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                  <div className="text-sm opacity-70">Carregando módulo...</div>
                </div>
              }>
                {renderActiveModule()}
              </Suspense>
            </main>

            <footer className="py-4 text-center text-[10px] font-mono text-[#697586]/70 border-t border-[#C8A45D]/15">
              {StorageService.getConfig().salonNetworkName || 'Bom Corte Salões'} // {StorageService.getConfig().slogan || 'Rede de Alta Performance & Gestão de Salões'}
            </footer>
          </div>
        </div>
      )}

      {configSenhaModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D1F30] border border-[#C8A45D]/40 rounded-2xl shadow-[0_0_60px_rgba(200,164,93,0.2)] p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C8A45D] to-[#A87F2E] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(200,164,93,0.5)]">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-white font-black text-lg mt-2">Acesso Restrito</h3>
              <p className="text-[#B49A73] text-xs font-mono">Digite a senha para acessar as Configurações</p>
            </div>
            <div className="space-y-2">
              <input
                type="password"
                value={configSenhaInput}
                onChange={(e) => setConfigSenhaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfigSenhaSubmit()}
                placeholder="Senha de acesso..."
                autoFocus
                className="w-full bg-[#071829] border border-[#C8A45D]/30 focus:border-[#C8A45D] text-white rounded-xl px-4 py-3 text-sm font-mono outline-none transition-colors placeholder:text-[#697586]"
              />
              {configSenhaErro && (
                <p className="text-rose-400 text-xs font-mono text-center animate-pulse">{configSenhaErro}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfigSenhaModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#C8A45D]/30 text-[#B49A73] text-sm font-bold hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfigSenhaSubmit}
                disabled={configSenhaTentativas >= 3}
                className="flex-1 py-2.5 rounded-xl bg-[#C8A45D] hover:bg-[#D9B76C] text-black text-sm font-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}
      {showForceUpdate && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071829] p-4">
          <div className="w-full max-w-sm bg-[#0D1F30] border border-amber-500/50 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.3)] p-8 space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(245,158,11,0.6)] animate-pulse">
              <span className="text-4xl text-white">🔄</span>
            </div>
            <div>
              <h2 className="text-white font-black text-2xl mb-2">Atualização Necessária</h2>
              <p className="text-[#B49A73] text-sm leading-relaxed">
                Nós lançamos uma nova versão do aplicativo com melhorias!<br/><br/>
                Para continuar usando e evitar erros, por favor limpe o cache tocando no botão abaixo.
              </p>
            </div>
            <button
              onClick={() => {
                const savedEmail = localStorage.getItem('SAVED_LOGIN_EMAIL');
                localStorage.clear();
                sessionStorage.clear();
                localStorage.setItem('BOMCORTE_APP_VERSION', CURRENT_APP_VERSION);
                if (savedEmail) localStorage.setItem('SAVED_LOGIN_EMAIL', savedEmail);
                window.location.href = window.location.pathname + '?reload=' + new Date().getTime();
              }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-white font-black text-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer uppercase tracking-wide"
            >
              Limpar Cache Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
