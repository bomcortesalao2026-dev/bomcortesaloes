import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Building2, 
  Bell, 
  Scissors,
  Clock,
  ChevronRight
} from 'lucide-react';
import { User, Filial, ActiveModule, Funcao } from '../types';
import { StorageService, FechamentoStatus } from '../services/storage';
import { CycleGatekeeperStatus } from '../utils/dateCycleUtils';

interface CyberHeaderProps {
  currentUser: User;
  onToggleSidebar: () => void;
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  pendingApprovalsCount: number;
  onLogout?: () => void;
  vendedorNegativeMode?: boolean;
  gatekeeperStatus?: CycleGatekeeperStatus;
  fechamentoStatus?: FechamentoStatus;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  currentUser,
  onToggleSidebar,
  activeModule,
  onSelectModule,
  pendingApprovalsCount,
  vendedorNegativeMode = false,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>(StorageService.getFuncoes());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFiliais(StorageService.getFiliais());
    setFuncoes(StorageService.getFuncoes());
  }, [currentUser]);

  const currentFilial = filiais.find(f => f.id === currentUser.filialId);

  const getModuleTitle = (mod: ActiveModule): string => {
    switch (mod) {
      case 'DASHBOARD': return 'Dashboard Executivo';
      case 'FILIAIS': return 'Gestão de Filiais';
      case 'GERENTES': return 'Gerentes de Filial';
      case 'VENDEDORES': return 'Funcionários & Profissionais';
      case 'FUNCOES': return 'Cargos & Funções';
      case 'SERVICOS': return 'Catálogo de Serviços & Comissões';
      case 'REGISTRAR_SERVICO': return 'Lançamento Rápido de Atendimento';
      case 'MEUS_SERVICOS': return 'Meus Serviços Registrados';
      case 'MINHAS_COMISSOES': return 'Minhas Comissões & Ganhos';
      case 'SOLICITAR_VALE': return 'Solicitar Vale / Adiantamento';
      case 'MEUS_VALES': return 'Histórico de Vales';
      case 'MEUS_PAGAMENTOS': return 'Meus Fechamentos Semanais';
      case 'APROVACOES': return 'Painel de Aprovações Pendentes';
      case 'VALES': return 'Gestão de Vales & Adiantamentos';
      case 'PAGAMENTOS': return 'Fechamentos Semanais & Repasses';
      case 'RELATORIOS': return 'Relatórios & Business Intelligence';
      case 'AUDITORIA': return 'Trilha de Auditoria & Segurança';
      case 'PERFIL': return 'Meu Perfil & Segurança';
      case 'CONFIGURACOES': return 'Configurações da Rede';
      default: return StorageService.getConfig().salonNetworkName || 'Bom Corte Salões';
    }
  };

  const funcaoName = currentUser.role === 'VENDEDOR'
    ? (funcoes.find(f => f.id === currentUser.funcaoId)?.name || 'Profissional')
    : null;
  const roleLabel = currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'GERENTE' ? 'Gerente' : (funcaoName || 'Profissional');
  const roleColor = currentUser.role === 'ADMIN'
    ? 'text-[#C8A45D] border-[#C8A45D]/40 bg-[#C8A45D]/10'
    : currentUser.role === 'GERENTE'
    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
    : 'text-sky-400 border-sky-500/40 bg-sky-500/10';

  return (
    <header
      className="sticky top-0 z-30 w-full flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5"
      style={{
        background: 'rgba(8, 14, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200, 164, 93, 0.18)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,164,93,0.08)',
      }}
    >
      {/* ───── LEFT: Hamburger + Breadcrumb ───── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger */}
        <button
          id="header-toggle-sidebar"
          onClick={onToggleSidebar}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[#C8A45D] transition-all cursor-pointer hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(200,164,93,0.1)',
            border: '1px solid rgba(200,164,93,0.25)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          title="Abrir Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Title block */}
        <div className="min-w-0">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Role badge */}
            <span className={`inline-flex items-center text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-md border ${roleColor}`}>
              {roleLabel}
            </span>

            {vendedorNegativeMode && (
              <span className="inline-flex items-center text-[9px] font-mono font-black tracking-widest uppercase px-2 py-0.5 rounded-md border border-rose-500/60 bg-rose-600/20 text-rose-300 animate-pulse">
                ⚠ MODO QUITAÇÃO
              </span>
            )}

            {/* Filial badge */}
            {currentFilial && (
              <>
                <ChevronRight className="w-3 h-3 text-[#C8A45D]/40 shrink-0" />
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-md border text-[#C8A45D] border-[#C8A45D]/30"
                  style={{ background: 'rgba(200,164,93,0.08)' }}
                >
                  <Building2 className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[100px] sm:max-w-[160px]">{currentFilial.name}</span>
                </span>
              </>
            )}
          </div>

          {/* Module title */}
          <h1 className="text-sm sm:text-base font-bold tracking-wide truncate leading-tight mt-0.5"
            style={{ color: '#E8EDF5' }}
          >
            {getModuleTitle(activeModule)}
          </h1>
        </div>
      </div>

      {/* ───── RIGHT: Clock + Approvals + Fast Action ───── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Live Clock — hidden on very small screens */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl nexus-border-energy"
          style={{
            background: 'rgba(200,164,93,0.07)',
            border: '1px solid rgba(200,164,93,0.25)',
          }}
        >
          <Clock className="w-3.5 h-3.5 text-[#C8A45D]" />
          <span className="text-[12px] font-mono font-black gold-blink tracking-wider">{time}</span>
          <span className="text-[10px] font-mono text-[#A8B8CC] hidden md:inline">{date}</span>
        </div>

        {/* Pending Approvals — Admin / Gerente */}
        {(currentUser.role === 'ADMIN' || currentUser.role === 'GERENTE') && (
          <button
            id="header-approvals-badge"
            onClick={() => onSelectModule('APROVACOES')}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              pendingApprovalsCount > 0 ? 'animate-pulse-glow' : ''
            }`}
            style={
              pendingApprovalsCount > 0
                ? {
                    background: 'rgba(200,164,93,0.2)',
                    border: '1px solid rgba(200,164,93,0.6)',
                    color: '#FFE08A',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(200,164,93,0.18)',
                    color: '#6B7F96',
                  }
            }
          >
            <Bell className={`w-4 h-4 ${pendingApprovalsCount > 0 ? 'gold-blink' : 'text-[#6B7F96]'}`} />
            <span className="hidden sm:inline">Aprovações</span>
            {pendingApprovalsCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black text-[#0B1120] badge-pop"
                style={{ background: 'linear-gradient(135deg,#FFE08A,#C8A45D)', boxShadow: '0 0 10px rgba(200,164,93,0.8)' }}
              >
                {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
              </span>
            )}
          </button>
        )}

        {/* Fast Action — Vendedor */}
        {currentUser.role === 'VENDEDOR' && (
          <button
            id="header-fast-register-service"
            onClick={() => onSelectModule('REGISTRAR_SERVICO')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#C8A45D,#9F7B2E)',
              boxShadow: '0 0 14px rgba(200,164,93,0.35)',
              color: '#fff',
            }}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Atendimento</span>
          </button>
        )}

      </div>
    </header>
  );
};
